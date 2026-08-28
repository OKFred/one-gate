import { beforeEach, describe, expect, it } from "vitest";
import {
  OAuthError,
  OAuthErrorCode,
  type LocalOAuthUser,
  type OAuthBinding,
  type OAuthProvider,
  type OAuthStateRecord,
  type VerifiedOAuthIdentity,
} from "../domain/oauth.js";
import type {
  OAuthBindingRepositoryPort,
  OAuthCipherPort,
  OAuthProviderPort,
  OAuthStatePort,
  SaveOAuthBinding,
} from "./ports.js";
import { OAuthCenter } from "./oauth-center.js";

class FakeState implements OAuthStatePort {
  readonly records = new Map<string, OAuthStateRecord>();
  private sequence = 0;

  async create(record: OAuthStateRecord): Promise<string> {
    const state = `state-${++this.sequence}`;
    this.records.set(state, record);
    return state;
  }

  async consume(
    state: string,
    _consumedAtUtc: number
  ): Promise<OAuthStateRecord | null> {
    const record = this.records.get(state) ?? null;
    this.records.delete(state);
    return record;
  }

  async deleteRetired(nowUtc: number): Promise<number> {
    let deleted = 0;
    for (const [state, record] of this.records) {
      if (record.expiresAtUtc <= nowUtc) {
        this.records.delete(state);
        deleted += 1;
      }
    }
    return deleted;
  }
}

class FakeRepository implements OAuthBindingRepositoryPort {
  bindings: OAuthBinding[] = [];
  users: LocalOAuthUser[] = [];
  insertCount = 0;

  async findByIdentity(provider: OAuthProvider, providerId: string) {
    return (
      this.bindings.find(
        (binding) =>
          binding.provider === provider && binding.providerId === providerId
      ) ?? null
    );
  }

  async findByUserAndProvider(userId: number, provider: OAuthProvider) {
    return (
      this.bindings.find(
        (binding) => binding.userId === userId && binding.provider === provider
      ) ?? null
    );
  }

  async listByUser(userId: number) {
    return this.bindings.filter((binding) => binding.userId === userId);
  }

  async insert(binding: SaveOAuthBinding): Promise<number> {
    const id = ++this.insertCount;
    this.bindings.push({ id, ...binding });
    return id;
  }

  async update(id: number, binding: SaveOAuthBinding): Promise<void> {
    const index = this.bindings.findIndex((item) => item.id === id);
    if (index >= 0) this.bindings[index] = { id, ...binding };
  }

  async deleteByUserAndProvider(
    userId: number,
    provider: OAuthProvider
  ): Promise<void> {
    this.bindings = this.bindings.filter(
      (binding) => binding.userId !== userId || binding.provider !== provider
    );
  }

  async findLocalUser(userId: number) {
    return this.users.find((user) => user.id === userId) ?? null;
  }
}

class FakeCipher implements OAuthCipherPort {
  async encrypt(plaintext: string, aad: string): Promise<string> {
    return `${aad}|${plaintext}`;
  }

  async decrypt(ciphertext: string, aad: string): Promise<string> {
    const prefix = `${aad}|`;
    if (!ciphertext.startsWith(prefix)) throw new Error("AAD mismatch");
    return ciphertext.slice(prefix.length);
  }
}

class FakeProvider implements OAuthProviderPort {
  revokedTokens: string[] = [];
  revokeFails = false;

  constructor(
    readonly provider: OAuthProvider,
    public identity: VerifiedOAuthIdentity
  ) {}

  getAuthorizationUrl(params: { state: string; redirectUri: string }): string {
    return `https://${this.provider}.example/authorize?state=${params.state}&redirect_uri=${encodeURIComponent(params.redirectUri)}`;
  }

  async exchangeAndVerify(): Promise<VerifiedOAuthIdentity> {
    return structuredClone(this.identity);
  }

  async revokeGrant(accessToken: string): Promise<void> {
    if (this.revokeFails) {
      throw new OAuthError(OAuthErrorCode.REVOKE_FAILED, "revoke failed");
    }
    this.revokedTokens.push(accessToken);
  }
}

const githubIdentity: VerifiedOAuthIdentity = {
  provider: "github",
  providerId: "gh-1",
  providerUsername: "octocat",
  providerTenantId: "OKFred",
  profile: { login: "octocat", email: "private@example.com" },
  credentials: { accessToken: "github-secret-token", scopes: ["read:org"] },
};

const feishuIdentity: VerifiedOAuthIdentity = {
  provider: "feishu",
  providerId: "ou_1",
  providerUsername: "测试成员",
  providerTenantId: "tenant-1",
  profile: {
    name: "测试成员",
    mobile: "+8613800000000",
    status: { is_activated: true },
  },
  credentials: {
    accessToken: "ephemeral-feishu-token",
    scopes: ["contact:user.base:readonly"],
  },
};

describe("OAuthCenter", () => {
  let state: FakeState;
  let repository: FakeRepository;
  let github: FakeProvider;
  let feishu: FakeProvider;
  let now: number;
  let center: OAuthCenter;

  beforeEach(() => {
    state = new FakeState();
    repository = new FakeRepository();
    repository.users = [
      { id: 1, username: "admin", langCode: "zh-CN", isEnabled: true },
      { id: 2, username: "disabled", langCode: "zh-CN", isEnabled: false },
    ];
    github = new FakeProvider("github", githubIdentity);
    feishu = new FakeProvider("feishu", feishuIdentity);
    now = 1_700_000_000_000;
    center = new OAuthCenter({
      state,
      repository,
      cipher: new FakeCipher(),
      clock: { now: () => now },
      tokenIssuer: { issue: (user) => `jwt-${user.id}` },
      providers: { github, feishu },
      allowedRedirectOrigins: () => ["http://localhost:5173"],
    });
  });

  it("state 十分钟有效且只能消费一次", async () => {
    const { url } = await center.createLoginUrl({
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
    });
    const rawState = new URL(url).searchParams.get("state");
    expect(rawState).toBeTruthy();
    await expect(
      center.loginCallback({ code: "code", state: rawState! })
    ).rejects.toMatchObject({ code: OAuthErrorCode.ACCOUNT_NOT_BOUND });
    await expect(
      center.loginCallback({ code: "code", state: rawState! })
    ).rejects.toMatchObject({ code: OAuthErrorCode.INVALID_STATE });

    const expired = await center.createLoginUrl({
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
    });
    now += 10 * 60 * 1000 + 1;
    await expect(
      center.loginCallback({
        code: "code",
        state: new URL(expired.url).searchParams.get("state")!,
      })
    ).rejects.toMatchObject({ code: OAuthErrorCode.INVALID_STATE });
  });

  it("未绑定身份拒绝登录且不会创建本地用户", async () => {
    const userCount = repository.users.length;
    const { url } = await center.createLoginUrl({
      provider: "feishu",
      redirectUri: "http://localhost:5173/oauth/callback",
    });
    await expect(
      center.loginCallback({
        code: "code",
        state: new URL(url).searchParams.get("state")!,
      })
    ).rejects.toMatchObject({
      code: OAuthErrorCode.ACCOUNT_NOT_BOUND,
      message: "账号未绑定，请联系管理员",
    });
    expect(repository.users).toHaveLength(userCount);
    expect(repository.insertCount).toBe(0);
  });

  it("绑定飞书后通过 cipher port 保存完整档案但不持久化 user token", async () => {
    const { url } = await center.createAccountUrl({
      provider: "feishu",
      redirectUri: "http://localhost:5173/oauth/callback",
      intent: "bind",
      userId: 1,
    });
    await center.accountCallback({
      code: "code",
      state: new URL(url).searchParams.get("state")!,
      userId: 1,
    });
    const binding = repository.bindings[0];
    expect(binding.encryptedProfile).toContain("测试成员");
    expect(binding.encryptedAccessToken).toBeNull();
    const profile = await center.getBindingProfile({
      userId: 1,
      provider: "feishu",
    });
    expect(profile.profile.mobile).toBe("+8613800000000");

    const loginUrl = await center.createLoginUrl({
      provider: "feishu",
      redirectUri: "http://localhost:5173/oauth/callback",
    });
    const result = await center.loginCallback({
      code: "code",
      state: new URL(loginUrl.url).searchParams.get("state")!,
    });
    expect(result.userObj).toMatchObject({ id: 1, token: "jwt-1" });
  });

  it("拒绝重复身份绑定、其他账号 state 和停用本地用户", async () => {
    const first = await center.createAccountUrl({
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
      intent: "bind",
      userId: 1,
    });
    await expect(
      center.accountCallback({
        code: "code",
        state: new URL(first.url).searchParams.get("state")!,
        userId: 2,
      })
    ).rejects.toMatchObject({ code: OAuthErrorCode.INVALID_STATE });

    const bind = await center.createAccountUrl({
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
      intent: "bind",
      userId: 1,
    });
    await center.accountCallback({
      code: "code",
      state: new URL(bind.url).searchParams.get("state")!,
      userId: 1,
    });
    repository.users[0].isEnabled = false;
    const login = await center.createLoginUrl({
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
    });
    await expect(
      center.loginCallback({
        code: "code",
        state: new URL(login.url).searchParams.get("state")!,
      })
    ).rejects.toMatchObject({ code: OAuthErrorCode.ACCOUNT_DISABLED });
  });

  it("GitHub 撤权失败保留绑定，204语义成功后才删除", async () => {
    const bind = await center.createAccountUrl({
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
      intent: "bind",
      userId: 1,
    });
    await center.accountCallback({
      code: "code",
      state: new URL(bind.url).searchParams.get("state")!,
      userId: 1,
    });
    github.revokeFails = true;
    await expect(
      center.unbind({ userId: 1, provider: "github" })
    ).rejects.toMatchObject({ code: OAuthErrorCode.REVOKE_FAILED });
    expect(repository.bindings).toHaveLength(1);

    github.revokeFails = false;
    await expect(
      center.unbind({ userId: 1, provider: "github" })
    ).resolves.toMatchObject({
      unbound: true,
    });
    expect(github.revokedTokens).toEqual(["github-secret-token"]);
    expect(repository.bindings).toHaveLength(0);
  });

  it("历史 GitHub 绑定缺 token 时要求原身份重授权", async () => {
    repository.bindings.push({
      id: 9,
      userId: 1,
      provider: "github",
      providerId: "gh-1",
      providerUsername: "octocat",
      providerTenantId: null,
      encryptedProfile: null,
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      scopes: null,
      tokenExpiresAtUtc: null,
      lastVerifiedAtUtc: null,
    });
    const pending = await center.unbind({
      userId: 1,
      provider: "github",
      redirectUri: "http://localhost:5173/oauth/callback",
    });
    expect(pending).toMatchObject({
      unbound: false,
      reauthorizationRequired: true,
    });
    expect(pending.url).toContain("github.example");
    const result = await center.accountCallback({
      code: "code",
      state: new URL(pending.url!).searchParams.get("state")!,
      userId: 1,
    });
    expect(result).toEqual({ message: "解绑成功", unbound: true });
    expect(repository.bindings).toHaveLength(0);
  });
});
