import {
  OAuthError,
  OAuthErrorCode,
  sensitiveAad,
  validateRedirectUri,
  type JsonObject,
  type OAuthBinding,
  type OAuthIntent,
  type OAuthProvider,
  type VerifiedOAuthIdentity,
} from "../domain/oauth.js";
import type {
  OAuthBindingProfile,
  OAuthBindingRepositoryPort,
  OAuthCipherPort,
  OAuthClockPort,
  OAuthProviderPort,
  OAuthStatePort,
  OAuthTokenIssuerPort,
  SaveOAuthBinding,
} from "./ports.js";

const STATE_TTL_MS = 10 * 60 * 1000;

export type OAuthLoginResult = {
  userObj: {
    id: number;
    username: string;
    langCode: string;
    token: string;
  };
};

export type OAuthBindingSummary = {
  provider: OAuthProvider;
  providerUsername: string | null;
  providerTenantId: string | null;
  lastVerifiedAtUtc: number | null;
  hasProfile: boolean;
};

export type OAuthUnbindResult = {
  message: string;
  unbound: boolean;
  reauthorizationRequired: boolean;
  url?: string;
};

type OAuthCenterDependencies = {
  state: OAuthStatePort;
  repository: OAuthBindingRepositoryPort;
  cipher: OAuthCipherPort;
  clock: OAuthClockPort;
  tokenIssuer: OAuthTokenIssuerPort;
  providers: Record<OAuthProvider, OAuthProviderPort>;
  allowedRedirectOrigins: () => readonly string[];
};

export class OAuthCenter {
  constructor(private readonly dependencies: OAuthCenterDependencies) {}

  async createLoginUrl(params: {
    provider: OAuthProvider;
    redirectUri: string;
  }): Promise<{ url: string }> {
    return this.createAuthorizationUrl({
      ...params,
      intent: "login",
      userId: null,
    });
  }

  async createAccountUrl(params: {
    provider: OAuthProvider;
    redirectUri: string;
    intent: "bind" | "unbind";
    userId: number;
  }): Promise<{ url: string }> {
    if (params.intent === "unbind" && params.provider !== "github") {
      throw new OAuthError(
        OAuthErrorCode.INVALID_REQUEST,
        "只有 GitHub 历史绑定需要解绑重授权"
      );
    }
    await this.requireEnabledUser(params.userId);
    return this.createAuthorizationUrl(params);
  }

  async loginCallback(params: {
    code: string;
    state: string;
  }): Promise<OAuthLoginResult> {
    const state = await this.consumeState(params.state, "login");
    if (state.userId !== null) {
      throw new OAuthError(
        OAuthErrorCode.INVALID_STATE,
        "OAuth 登录 state 无效"
      );
    }
    const identity = await this.dependencies.providers[
      state.provider
    ].exchangeAndVerify({
      code: params.code,
      redirectUri: state.redirectUri,
      intent: state.intent,
    });
    const binding = await this.dependencies.repository.findByIdentity(
      identity.provider,
      identity.providerId
    );
    if (!binding) {
      throw new OAuthError(
        OAuthErrorCode.ACCOUNT_NOT_BOUND,
        "账号未绑定，请联系管理员"
      );
    }
    this.assertIdentityMatchesBinding(identity, binding);
    const user = await this.requireEnabledUser(binding.userId);
    await this.refreshBinding(binding, identity);
    return {
      userObj: {
        id: user.id,
        username: user.username,
        langCode: user.langCode,
        token: this.dependencies.tokenIssuer.issue(user),
      },
    };
  }

  async accountCallback(params: {
    code: string;
    state: string;
    userId: number;
  }): Promise<{ message: string; unbound: boolean }> {
    const state = await this.consumeState(params.state, ["bind", "unbind"]);
    if (state.userId === null || state.userId !== params.userId) {
      throw new OAuthError(
        OAuthErrorCode.INVALID_STATE,
        "OAuth 账号 state 无效"
      );
    }
    await this.requireEnabledUser(state.userId);
    const identity = await this.dependencies.providers[
      state.provider
    ].exchangeAndVerify({
      code: params.code,
      redirectUri: state.redirectUri,
      intent: state.intent,
    });
    if (state.intent === "unbind") {
      await this.finishReauthorizedUnbind(state.userId, identity);
      return { message: "解绑成功", unbound: true };
    }
    await this.bindIdentity(state.userId, identity);
    return { message: "绑定成功", unbound: false };
  }

  async unbind(params: {
    userId: number;
    provider: OAuthProvider;
    redirectUri?: string;
  }): Promise<OAuthUnbindResult> {
    await this.requireEnabledUser(params.userId);
    const binding = await this.dependencies.repository.findByUserAndProvider(
      params.userId,
      params.provider
    );
    if (!binding) {
      throw new OAuthError(
        OAuthErrorCode.BINDING_NOT_FOUND,
        "OAuth 绑定不存在"
      );
    }
    if (params.provider === "feishu") {
      await this.dependencies.repository.deleteByUserAndProvider(
        params.userId,
        params.provider
      );
      return {
        message: "解绑成功",
        unbound: true,
        reauthorizationRequired: false,
      };
    }
    if (!binding.encryptedAccessToken) {
      const authorization = params.redirectUri
        ? await this.createAccountUrl({
            provider: "github",
            redirectUri: params.redirectUri,
            intent: "unbind",
            userId: params.userId,
          })
        : undefined;
      return {
        message: "历史绑定需要重新授权后才能撤销 GitHub 授权",
        unbound: false,
        reauthorizationRequired: true,
        ...(authorization ? { url: authorization.url } : {}),
      };
    }
    const accessToken = await this.decryptBindingField(
      binding,
      binding.encryptedAccessToken,
      "access-token"
    );
    await this.dependencies.providers.github.revokeGrant(accessToken);
    await this.dependencies.repository.deleteByUserAndProvider(
      params.userId,
      "github"
    );
    return {
      message: "解绑成功",
      unbound: true,
      reauthorizationRequired: false,
    };
  }

  async getBindingProfile(params: {
    userId: number;
    provider: OAuthProvider;
  }): Promise<OAuthBindingProfile> {
    await this.requireEnabledUser(params.userId);
    const binding = await this.dependencies.repository.findByUserAndProvider(
      params.userId,
      params.provider
    );
    if (!binding) {
      throw new OAuthError(
        OAuthErrorCode.BINDING_NOT_FOUND,
        "OAuth 绑定不存在"
      );
    }
    const profile = binding.encryptedProfile
      ? this.parseProfile(
          await this.decryptBindingField(
            binding,
            binding.encryptedProfile,
            "profile"
          )
        )
      : {};
    return {
      provider: binding.provider,
      providerId: binding.providerId,
      providerUsername: binding.providerUsername,
      providerTenantId: binding.providerTenantId,
      profile,
      lastVerifiedAtUtc: binding.lastVerifiedAtUtc,
    };
  }

  async getBindingSummaries(userId: number): Promise<OAuthBindingSummary[]> {
    const bindings = await this.dependencies.repository.listByUser(userId);
    return bindings.map((binding) => ({
      provider: binding.provider,
      providerUsername: binding.providerUsername,
      providerTenantId: binding.providerTenantId,
      lastVerifiedAtUtc: binding.lastVerifiedAtUtc,
      hasProfile: binding.encryptedProfile !== null,
    }));
  }

  private async createAuthorizationUrl(params: {
    provider: OAuthProvider;
    redirectUri: string;
    intent: OAuthIntent;
    userId: number | null;
  }): Promise<{ url: string }> {
    const nowUtc = this.dependencies.clock.now();
    const redirectUri = validateRedirectUri(
      params.redirectUri,
      this.dependencies.allowedRedirectOrigins()
    );
    await this.dependencies.state.deleteRetired(nowUtc);
    const state = await this.dependencies.state.create({
      provider: params.provider,
      intent: params.intent,
      redirectUri,
      userId: params.userId,
      expiresAtUtc: nowUtc + STATE_TTL_MS,
    });
    return {
      url: this.dependencies.providers[params.provider].getAuthorizationUrl({
        state,
        redirectUri,
      }),
    };
  }

  private async consumeState(
    rawState: string,
    expectedIntent: OAuthIntent | readonly OAuthIntent[]
  ) {
    const nowUtc = this.dependencies.clock.now();
    const state = await this.dependencies.state.consume(rawState, nowUtc);
    const expected = Array.isArray(expectedIntent)
      ? expectedIntent
      : [expectedIntent];
    if (
      !state ||
      state.expiresAtUtc <= nowUtc ||
      !expected.includes(state.intent)
    ) {
      throw new OAuthError(
        OAuthErrorCode.INVALID_STATE,
        "OAuth state 无效、已过期或已被使用"
      );
    }
    return state;
  }

  private async bindIdentity(
    userId: number,
    identity: VerifiedOAuthIdentity
  ): Promise<void> {
    const identityBinding = await this.dependencies.repository.findByIdentity(
      identity.provider,
      identity.providerId
    );
    if (identityBinding && identityBinding.userId !== userId) {
      throw new OAuthError(
        OAuthErrorCode.BINDING_CONFLICT,
        "此 OAuth 账号已被系统内的其他用户绑定"
      );
    }
    const userBinding =
      await this.dependencies.repository.findByUserAndProvider(
        userId,
        identity.provider
      );
    if (userBinding && userBinding.providerId !== identity.providerId) {
      throw new OAuthError(
        OAuthErrorCode.BINDING_CONFLICT,
        `当前用户已经绑定其他 ${identity.provider} 账号`
      );
    }
    const existing = identityBinding ?? userBinding;
    if (existing) {
      await this.refreshBinding(existing, identity);
      return;
    }
    const binding = await this.buildSavedBinding(userId, identity);
    await this.dependencies.repository.insert(binding);
  }

  private async finishReauthorizedUnbind(
    userId: number,
    identity: VerifiedOAuthIdentity
  ): Promise<void> {
    if (identity.provider !== "github") {
      throw new OAuthError(
        OAuthErrorCode.INVALID_STATE,
        "解绑重授权 Provider 无效"
      );
    }
    const binding = await this.dependencies.repository.findByUserAndProvider(
      userId,
      "github"
    );
    if (!binding || binding.providerId !== identity.providerId) {
      throw new OAuthError(
        OAuthErrorCode.BINDING_CONFLICT,
        "重新授权的 GitHub 账号与历史绑定不一致"
      );
    }
    await this.dependencies.providers.github.revokeGrant(
      identity.credentials.accessToken
    );
    await this.dependencies.repository.deleteByUserAndProvider(
      userId,
      "github"
    );
  }

  private async refreshBinding(
    binding: OAuthBinding,
    identity: VerifiedOAuthIdentity
  ): Promise<void> {
    const saved = await this.buildSavedBinding(binding.userId, identity);
    await this.dependencies.repository.update(binding.id, saved);
  }

  private async buildSavedBinding(
    userId: number,
    identity: VerifiedOAuthIdentity
  ): Promise<SaveOAuthBinding> {
    const identityKey = {
      userId,
      provider: identity.provider,
      providerId: identity.providerId,
    };
    const encryptedProfile = await this.encryptBindingField(
      JSON.stringify(identity.profile),
      sensitiveAad(identityKey, "profile")
    );
    const persistToken = identity.provider === "github";
    const encryptedAccessToken = persistToken
      ? await this.encryptBindingField(
          identity.credentials.accessToken,
          sensitiveAad(identityKey, "access-token")
        )
      : null;
    const encryptedRefreshToken =
      persistToken && identity.credentials.refreshToken
        ? await this.encryptBindingField(
            identity.credentials.refreshToken,
            sensitiveAad(identityKey, "refresh-token")
          )
        : null;
    return {
      ...identityKey,
      providerUsername: identity.providerUsername,
      providerTenantId: identity.providerTenantId,
      encryptedProfile,
      encryptedAccessToken,
      encryptedRefreshToken,
      scopes: identity.credentials.scopes,
      tokenExpiresAtUtc: persistToken
        ? (identity.credentials.expiresAtUtc ?? null)
        : null,
      lastVerifiedAtUtc: this.dependencies.clock.now(),
    };
  }

  private async requireEnabledUser(userId: number) {
    const user = await this.dependencies.repository.findLocalUser(userId);
    if (!user || !user.isEnabled) {
      throw new OAuthError(
        OAuthErrorCode.ACCOUNT_DISABLED,
        "关联的本地账号不存在或已停用"
      );
    }
    return user;
  }

  private assertIdentityMatchesBinding(
    identity: VerifiedOAuthIdentity,
    binding: OAuthBinding
  ): void {
    if (
      identity.provider !== binding.provider ||
      identity.providerId !== binding.providerId ||
      (binding.providerTenantId !== null &&
        identity.providerTenantId !== binding.providerTenantId)
    ) {
      throw new OAuthError(
        OAuthErrorCode.BINDING_CONFLICT,
        "OAuth 身份与本地绑定不一致"
      );
    }
  }

  private async encryptBindingField(
    plaintext: string,
    aad: string
  ): Promise<string> {
    try {
      return await this.dependencies.cipher.encrypt(plaintext, aad);
    } catch {
      throw new OAuthError(
        OAuthErrorCode.SENSITIVE_DATA_FAILURE,
        "OAuth 敏感数据加密失败"
      );
    }
  }

  private async decryptBindingField(
    binding: OAuthBinding,
    ciphertext: string,
    field: "profile" | "access-token" | "refresh-token"
  ): Promise<string> {
    try {
      return await this.dependencies.cipher.decrypt(
        ciphertext,
        sensitiveAad(binding, field)
      );
    } catch {
      throw new OAuthError(
        OAuthErrorCode.SENSITIVE_DATA_FAILURE,
        "OAuth 敏感数据解密失败"
      );
    }
  }

  private parseProfile(value: string): JsonObject {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
        return parsed as JsonObject;
      }
    } catch {
      // The encrypted payload exists but is not a valid profile snapshot.
    }
    throw new OAuthError(
      OAuthErrorCode.SENSITIVE_DATA_FAILURE,
      "OAuth 档案数据无效"
    );
  }
}
