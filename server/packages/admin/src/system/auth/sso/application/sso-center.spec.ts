import { beforeEach, describe, expect, it } from "vitest";
import type {
  LocalSsoUser,
  SsoBinding,
  SsoClientConfiguration,
  SsoTransaction,
  VerifiedSsoPrincipal,
} from "../domain/sso.js";
import { SsoErrorCode } from "../domain/sso.js";
import type {
  NewSsoBinding,
  SsoBindingCreateResult,
  SsoOidcProviderPort,
  SsoRepositoryPort,
} from "./ports.js";
import { SsoCenter } from "./sso-center.js";

class FakeRepository implements SsoRepositoryPort {
  readonly transactions = new Map<string, SsoTransaction>();
  bindings: SsoBinding[] = [];
  users: LocalSsoUser[] = [];
  nextBindingId = 1;
  createBindingCalls = 0;

  async createTransaction(transaction: SsoTransaction): Promise<void> {
    this.transactions.set(transaction.stateDigest, transaction);
  }

  async consumeTransaction(
    input: Parameters<SsoRepositoryPort["consumeTransaction"]>[0]
  ): Promise<SsoTransaction | null> {
    const transaction = this.transactions.get(input.stateDigest);
    if (
      !transaction ||
      transaction.consumedAtUtc !== null ||
      transaction.intent !== input.expectedIntent ||
      transaction.expectedUserId !== input.expectedUserId ||
      transaction.expiresAtUtc <= input.consumedAtUtc
    ) {
      return null;
    }
    transaction.consumedAtUtc = input.consumedAtUtc;
    return structuredClone(transaction);
  }

  async deleteRetiredTransactions(nowUtc: number): Promise<number> {
    let deleted = 0;
    for (const [stateDigest, transaction] of this.transactions) {
      if (
        transaction.consumedAtUtc !== null ||
        transaction.expiresAtUtc <= nowUtc
      ) {
        this.transactions.delete(stateDigest);
        deleted += 1;
      }
    }
    return deleted;
  }

  async findBindingBySubject(issuer: string, subject: string) {
    return (
      this.bindings.find(
        (binding) => binding.issuer === issuer && binding.subject === subject
      ) ?? null
    );
  }

  async findBindingByUserAndIssuer(userId: number, issuer: string) {
    return (
      this.bindings.find(
        (binding) => binding.userId === userId && binding.issuer === issuer
      ) ?? null
    );
  }

  async createBinding(binding: NewSsoBinding): Promise<SsoBindingCreateResult> {
    this.createBindingCalls += 1;
    if (
      this.bindings.some(
        (item) =>
          item.issuer === binding.issuer && item.subject === binding.subject
      )
    ) {
      return { outcome: "subject_conflict" };
    }
    if (
      this.bindings.some(
        (item) =>
          item.userId === binding.userId && item.issuer === binding.issuer
      )
    ) {
      return { outcome: "user_conflict" };
    }
    const bindingId = this.nextBindingId++;
    this.bindings.push({ id: bindingId, ...structuredClone(binding) });
    return { outcome: "created", bindingId };
  }

  async updateBindingVerification(
    bindingId: number,
    verified: VerifiedSsoPrincipal,
    verifiedAtUtc: number
  ): Promise<void> {
    this.bindings = this.bindings.map((binding) =>
      binding.id === bindingId
        ? {
            ...binding,
            principalUserId: verified.userId,
            tenantId: verified.tenantId,
            membershipId: verified.membershipId,
            clientId: verified.clientId,
            amr: [...verified.amr],
            scope: [...verified.scope],
            updateTimeUtc: verifiedAtUtc,
          }
        : binding
    );
  }

  async deleteBinding(userId: number, issuer: string): Promise<boolean> {
    const before = this.bindings.length;
    this.bindings = this.bindings.filter(
      (binding) => binding.userId !== userId || binding.issuer !== issuer
    );
    return before !== this.bindings.length;
  }

  async findLocalUser(userId: number) {
    return this.users.find((user) => user.id === userId) ?? null;
  }
}

class FakeProvider implements SsoOidcProviderPort {
  principal: VerifiedSsoPrincipal;
  lastAuthorizationInput:
    | Parameters<SsoOidcProviderPort["createAuthorizationUrl"]>[0]
    | null = null;
  lastExchangeInput: Parameters<SsoOidcProviderPort["exchangeCode"]>[0] | null =
    null;

  constructor(principal: VerifiedSsoPrincipal) {
    this.principal = principal;
  }

  async createAuthorizationUrl(
    input: Parameters<SsoOidcProviderPort["createAuthorizationUrl"]>[0]
  ): Promise<string> {
    this.lastAuthorizationInput = structuredClone(input);
    return `https://sso.example.com/oauth2/authorize?state=${input.state}`;
  }

  async exchangeCode(
    input: Parameters<SsoOidcProviderPort["exchangeCode"]>[0]
  ): Promise<VerifiedSsoPrincipal> {
    this.lastExchangeInput = structuredClone(input);
    return structuredClone(this.principal);
  }
}

const configuration: SsoClientConfiguration = {
  issuer: "https://sso.example.com/",
  clientId: "hodor-admin",
  audience: "https://hodor.example.com/api/v1",
  tenantId: "self",
  redirectUris: ["https://admin.example.com/oauth/callback"],
  allowInsecureLocalhost: false,
};

const principal: VerifiedSsoPrincipal = {
  issuer: "https://sso.example.com",
  subject: "subject-1",
  userId: "sso-user-1",
  tenantId: "self",
  membershipId: "membership-1",
  clientId: "hodor-admin",
  amr: ["pwd"],
  scope: ["openid", "profile"],
};

const REQUEST_ID = "request-sso-center-123";

describe("SsoCenter", () => {
  let repository: FakeRepository;
  let provider: FakeProvider;
  let now: number;
  let randomSequence: number;
  let center: SsoCenter;

  beforeEach(() => {
    repository = new FakeRepository();
    repository.users = [
      { id: 1, username: "admin", langCode: "zh-CN", isEnabled: true },
      { id: 2, username: "disabled", langCode: "zh-CN", isEnabled: false },
      { id: 3, username: "other", langCode: "zh-CN", isEnabled: true },
    ];
    provider = new FakeProvider(principal);
    now = 1_700_000_000_000;
    randomSequence = 0;
    center = new SsoCenter({
      repository,
      provider,
      clock: { now: () => now },
      idGenerator: { nextId: () => `transaction-${randomSequence + 1}` },
      random: {
        randomBase64Url: (byteLength) => {
          randomSequence += 1;
          return `${String(randomSequence).padStart(2, "0")}${"a".repeat(byteLength * 2 - 2)}`;
        },
      },
      hash: {
        sha256Base64Url: async (value) =>
          `${value.slice(0, 10).replace(/[^A-Za-z0-9_-]/g, "x")}${"h".repeat(33)}`,
      },
      cipher: {
        encrypt: async (plaintext, aad) => `${aad}|${plaintext}`,
        decrypt: async (ciphertext, aad) => {
          const prefix = `${aad}|`;
          if (!ciphertext.startsWith(prefix)) throw new Error("AAD mismatch");
          return ciphertext.slice(prefix.length);
        },
      },
      tokenIssuer: {
        issue: async ({ user, principal: verified }) =>
          `hodor-${user.id}-${verified.subject}`,
      },
      configuration: async () => configuration,
    });
  });

  it("创建十分钟 transaction 并向 Provider 传递 S256 PKCE 输入", async () => {
    const { state } = await createLoginState(center);
    const transaction = [...repository.transactions.values()][0];
    expect(transaction.expiresAtUtc - transaction.createTimeUtc).toBe(
      10 * 60 * 1000
    );
    expect(transaction.expectedUserId).toBeNull();
    expect(transaction.stateDigest).not.toBe(state);
    expect(provider.lastAuthorizationInput).toMatchObject({
      requestId: REQUEST_ID,
      issuer: "https://sso.example.com",
      clientId: "hodor-admin",
      pkce: { codeChallengeMethod: "S256" },
    });
  });

  it("state 过期或重放均被拒绝", async () => {
    const expired = await createLoginState(center);
    now += 10 * 60 * 1000;
    await expect(
      center.loginCallback({
        code: "code",
        state: expired.state,
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.INVALID_STATE });

    const replayed = await createLoginState(center);
    await expect(
      center.loginCallback({
        code: "code",
        state: replayed.state,
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_NOT_BOUND });
    await expect(
      center.loginCallback({
        code: "code",
        state: replayed.state,
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.INVALID_STATE });
  });

  it("错误 callback intent 不消费 state，随后仍可走正确入口", async () => {
    const { state } = await createLoginState(center);

    await expect(
      center.bindCallback({
        code: "code",
        state,
        userId: 1,
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.INVALID_STATE });
    await expect(
      center.loginCallback({ code: "code", state, requestId: REQUEST_ID })
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_NOT_BOUND });
  });

  it("创建新授权前清理已消费或过期 transaction", async () => {
    const first = await createLoginState(center);
    await expect(
      center.loginCallback({
        code: "code",
        state: first.state,
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_NOT_BOUND });
    expect(repository.transactions.size).toBe(1);

    await createLoginState(center);
    expect(repository.transactions.size).toBe(1);
  });

  it("未绑定登录返回 ACCOUNT_NOT_BOUND 且绝不创建用户或绑定", async () => {
    const userCount = repository.users.length;
    const { state } = await createLoginState(center);
    await expect(
      center.loginCallback({ code: "code", state, requestId: REQUEST_ID })
    ).rejects.toMatchObject({
      code: SsoErrorCode.ACCOUNT_NOT_BOUND,
      message: "账号未绑定，请联系管理员",
    });
    expect(repository.users).toHaveLength(userCount);
    expect(repository.createBindingCalls).toBe(0);
  });

  it("拒绝停用本地用户发起绑定或通过已有绑定登录", async () => {
    await expect(
      center.createBindUrl({
        userId: 2,
        redirectUri: configuration.redirectUris[0],
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_DISABLED });

    repository.bindings.push(makeBinding(2, principal));
    const { state } = await createLoginState(center);
    await expect(
      center.loginCallback({ code: "code", state, requestId: REQUEST_ID })
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_DISABLED });
  });

  it("bind transaction 只能由发起绑定的当前本地用户消费", async () => {
    const authorization = await center.createBindUrl({
      userId: 1,
      redirectUri: configuration.redirectUris[0],
      requestId: REQUEST_ID,
    });
    const state = new URL(authorization.url).searchParams.get("state");
    if (!state) throw new Error("Fake Provider 未返回 state");
    await expect(
      center.bindCallback({
        code: "code",
        state,
        userId: 3,
        requestId: REQUEST_ID,
      })
    ).rejects.toMatchObject({ code: SsoErrorCode.INVALID_STATE });
    expect(repository.createBindingCalls).toBe(0);
  });

  it("拒绝 subject 已绑定其他用户和用户已绑定其他 subject", async () => {
    repository.bindings.push(makeBinding(3, principal));
    await expect(bind(center, 1)).rejects.toMatchObject({
      code: SsoErrorCode.BINDING_CONFLICT,
    });

    repository.bindings = [
      makeBinding(1, { ...principal, subject: "another-subject" }),
    ];
    await expect(bind(center, 1)).rejects.toMatchObject({
      code: SsoErrorCode.BINDING_CONFLICT,
    });
  });

  it("完成显式绑定、登录签发 Hodor token 和解绑", async () => {
    const result = await bind(center, 1);
    expect(result.binding).toMatchObject({
      userId: 1,
      subject: "subject-1",
      tenantId: "self",
    });
    expect(repository.bindings).toHaveLength(1);

    const { state } = await createLoginState(center);
    await expect(
      center.loginCallback({ code: "code", state, requestId: REQUEST_ID })
    ).resolves.toEqual({
      userObj: {
        id: 1,
        username: "admin",
        langCode: "zh-CN",
        token: "hodor-1-subject-1",
      },
    });
    expect(provider.lastExchangeInput).toMatchObject({
      requestId: REQUEST_ID,
      audience: configuration.audience,
    });
    expect(repository.bindings[0]?.updateTimeUtc).toBe(now);
    await expect(center.getBindingSummary(1)).resolves.toMatchObject({
      userId: 1,
      issuer: "https://sso.example.com",
      subject: "subject-1",
    });
    await expect(center.unbind({ userId: 1 })).resolves.toEqual({
      message: "解绑成功",
    });
    expect(repository.bindings).toHaveLength(0);
    await expect(center.unbind({ userId: 1 })).rejects.toMatchObject({
      code: SsoErrorCode.BINDING_NOT_FOUND,
    });
  });

  it.each([
    ["issuer", { ...principal, issuer: "https://other.example.com" }],
    ["client", { ...principal, clientId: "other-client" }],
    ["tenant", { ...principal, tenantId: "other-tenant" }],
  ])("拒绝 %s 不符的主体", async (_label, mismatchedPrincipal) => {
    provider.principal = mismatchedPrincipal;
    const { state } = await createLoginState(center);
    await expect(
      center.loginCallback({ code: "code", state, requestId: REQUEST_ID })
    ).rejects.toMatchObject({ code: SsoErrorCode.PRINCIPAL_MISMATCH });
  });
});

async function createLoginState(center: SsoCenter): Promise<{ state: string }> {
  const result = await center.createLoginUrl({
    redirectUri: configuration.redirectUris[0],
    requestId: REQUEST_ID,
  });
  const state = new URL(result.url).searchParams.get("state");
  if (!state) throw new Error("Fake Provider 未返回 state");
  return { state };
}

async function bind(center: SsoCenter, userId: number) {
  const result = await center.createBindUrl({
    userId,
    redirectUri: configuration.redirectUris[0],
    requestId: REQUEST_ID,
  });
  const state = new URL(result.url).searchParams.get("state");
  if (!state) throw new Error("Fake Provider 未返回 state");
  return center.bindCallback({
    code: "code",
    state,
    userId,
    requestId: REQUEST_ID,
  });
}

function makeBinding(
  userId: number,
  verifiedPrincipal: VerifiedSsoPrincipal
): SsoBinding {
  return {
    id: userId,
    userId,
    issuer: verifiedPrincipal.issuer,
    subject: verifiedPrincipal.subject,
    principalUserId: verifiedPrincipal.userId,
    tenantId: verifiedPrincipal.tenantId,
    membershipId: verifiedPrincipal.membershipId,
    clientId: verifiedPrincipal.clientId,
    amr: verifiedPrincipal.amr,
    scope: verifiedPrincipal.scope,
    createTimeUtc: 1_700_000_000_000,
    updateTimeUtc: null,
  };
}
