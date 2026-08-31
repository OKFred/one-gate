import {
  assertPrincipalMatches,
  assertPrincipalMatchesBinding,
  createS256PkceInput,
  normalizeSsoIssuer,
  SsoError,
  SsoErrorCode,
  ssoTransactionAad,
  validateSsoRedirectUri,
  type LocalSsoUser,
  type SsoBinding,
  type SsoClientConfiguration,
  type SsoIntent,
  type SsoTransaction,
  type VerifiedSsoPrincipal,
} from "../domain/sso.js";
import type {
  CreateSsoAuthorizationInput,
  NewSsoBinding,
  SsoCenterDependencies,
} from "./ports.js";

const TRANSACTION_TTL_MS = 10 * 60 * 1000;

export type SsoLoginResult = {
  userObj: {
    id: number;
    username: string;
    langCode: string;
    token: string;
  };
};

export type SsoBindingResult = {
  message: string;
  binding: Omit<SsoBinding, "id">;
};

export class SsoCenter {
  constructor(private readonly dependencies: SsoCenterDependencies) {}

  async createLoginUrl(params: {
    redirectUri: string;
    requestId: string;
  }): Promise<{ url: string }> {
    return this.createAuthorization({
      intent: "login",
      redirectUri: params.redirectUri,
      userId: null,
      requestId: params.requestId,
    });
  }

  async createBindUrl(params: {
    redirectUri: string;
    userId: number;
    requestId: string;
  }): Promise<{ url: string }> {
    await this.requireEnabledUser(params.userId);
    return this.createAuthorization({
      intent: "bind",
      redirectUri: params.redirectUri,
      userId: params.userId,
      requestId: params.requestId,
    });
  }

  async loginCallback(params: {
    code: string;
    state: string;
    requestId: string;
  }): Promise<SsoLoginResult> {
    const completed = await this.completeAuthorization({
      ...params,
      expectedIntent: "login",
      currentUserId: null,
    });
    const binding = await this.dependencies.repository.findBindingBySubject(
      completed.principal.issuer,
      completed.principal.subject
    );
    if (!binding) {
      throw new SsoError(
        SsoErrorCode.ACCOUNT_NOT_BOUND,
        "账号未绑定，请联系管理员"
      );
    }
    assertPrincipalMatchesBinding(
      completed.principal,
      binding,
      completed.configuration
    );
    const user = await this.requireEnabledUser(binding.userId);
    await this.dependencies.repository.updateBindingVerification(
      binding.id,
      completed.principal,
      this.dependencies.clock.now()
    );
    const token = await this.dependencies.tokenIssuer.issue({
      user,
      principal: completed.principal,
    });
    return {
      userObj: {
        id: user.id,
        username: user.username,
        langCode: user.langCode,
        token,
      },
    };
  }

  async bindCallback(params: {
    code: string;
    state: string;
    userId: number;
    requestId: string;
  }): Promise<SsoBindingResult> {
    const completed = await this.completeAuthorization({
      ...params,
      expectedIntent: "bind",
      currentUserId: params.userId,
    });
    await this.requireEnabledUser(params.userId);
    const existingBySubject =
      await this.dependencies.repository.findBindingBySubject(
        completed.principal.issuer,
        completed.principal.subject
      );
    const existingByUser =
      await this.dependencies.repository.findBindingByUserAndIssuer(
        params.userId,
        completed.principal.issuer
      );
    this.assertBindingAvailability(
      params.userId,
      completed.principal,
      existingBySubject,
      existingByUser,
      completed.configuration
    );

    const binding = this.toNewBinding(
      params.userId,
      completed.principal,
      this.dependencies.clock.now()
    );
    if (!existingBySubject && !existingByUser) {
      const created = await this.dependencies.repository.createBinding(binding);
      if (created.outcome !== "created") {
        throw new SsoError(
          SsoErrorCode.BINDING_CONFLICT,
          created.outcome === "subject_conflict"
            ? "此 SSO 身份已被其他本地用户绑定"
            : "当前本地用户已绑定其他 SSO 身份"
        );
      }
    }
    return { message: "绑定成功", binding };
  }

  async unbind(params: { userId: number }): Promise<{ message: string }> {
    await this.requireEnabledUser(params.userId);
    const configuration = await this.getConfiguration();
    const removed = await this.dependencies.repository.deleteBinding(
      params.userId,
      configuration.issuer
    );
    if (!removed) {
      throw new SsoError(SsoErrorCode.BINDING_NOT_FOUND, "SSO 绑定不存在");
    }
    return { message: "解绑成功" };
  }

  async getBindingSummary(userId: number): Promise<SsoBinding | null> {
    await this.requireEnabledUser(userId);
    const configuration = await this.getConfiguration();
    return this.dependencies.repository.findBindingByUserAndIssuer(
      userId,
      configuration.issuer
    );
  }

  private async createAuthorization(
    input: CreateSsoAuthorizationInput & { requestId: string }
  ): Promise<{ url: string }> {
    if (
      (input.intent === "login" && input.userId !== null) ||
      (input.intent === "bind" && input.userId === null)
    ) {
      throw new SsoError(SsoErrorCode.INVALID_REQUEST, "SSO 操作上下文无效");
    }
    const configuration = await this.getConfiguration();
    const redirectUri = validateSsoRedirectUri(
      input.redirectUri,
      configuration
    );
    const id = this.dependencies.idGenerator.nextId();
    const state = this.dependencies.random.randomBase64Url(32);
    const nonce = this.dependencies.random.randomBase64Url(32);
    const codeVerifier = this.dependencies.random.randomBase64Url(48);
    const [stateDigest, nonceDigest, codeChallenge] = await Promise.all([
      this.dependencies.hash.sha256Base64Url(state),
      this.dependencies.hash.sha256Base64Url(nonce),
      this.dependencies.hash.sha256Base64Url(codeVerifier),
    ]);
    const pkce = createS256PkceInput(codeVerifier, codeChallenge);
    const now = this.dependencies.clock.now();
    const encryptedCodeVerifier = await this.encryptVerifier(
      id,
      pkce.codeVerifier
    );
    await this.dependencies.repository.deleteRetiredTransactions(now);
    await this.dependencies.repository.createTransaction({
      id,
      stateDigest,
      intent: input.intent,
      expectedUserId: input.userId,
      issuer: configuration.issuer,
      clientId: configuration.clientId,
      tenantId: configuration.tenantId,
      redirectUri,
      encryptedCodeVerifier,
      nonceDigest,
      expiresAtUtc: now + TRANSACTION_TTL_MS,
      consumedAtUtc: null,
      createTimeUtc: now,
    });
    const url = await this.dependencies.provider.createAuthorizationUrl({
      requestId: input.requestId,
      issuer: configuration.issuer,
      clientId: configuration.clientId,
      redirectUri,
      state,
      nonce,
      pkce: {
        codeChallenge: pkce.codeChallenge,
        codeChallengeMethod: pkce.codeChallengeMethod,
      },
    });
    return { url };
  }

  private async completeAuthorization(params: {
    code: string;
    state: string;
    expectedIntent: SsoIntent;
    currentUserId: number | null;
    requestId: string;
  }): Promise<{
    principal: VerifiedSsoPrincipal;
    transaction: SsoTransaction;
    configuration: SsoClientConfiguration;
  }> {
    if (!params.code.trim() || !params.state.trim()) {
      throw new SsoError(SsoErrorCode.INVALID_REQUEST, "SSO 回调参数无效");
    }
    const now = this.dependencies.clock.now();
    const stateDigest = await this.dependencies.hash.sha256Base64Url(
      params.state
    );
    const transaction = await this.dependencies.repository.consumeTransaction({
      stateDigest,
      expectedIntent: params.expectedIntent,
      expectedUserId: params.currentUserId,
      consumedAtUtc: now,
    });
    if (!transaction || transaction.expiresAtUtc <= now) {
      throw new SsoError(
        SsoErrorCode.INVALID_STATE,
        "SSO state 无效、已过期或已被使用"
      );
    }
    const configuration = await this.getConfiguration();
    if (
      transaction.issuer !== configuration.issuer ||
      transaction.clientId !== configuration.clientId ||
      transaction.tenantId !== configuration.tenantId ||
      !configuration.redirectUris.includes(transaction.redirectUri)
    ) {
      throw new SsoError(
        SsoErrorCode.INVALID_STATE,
        "SSO transaction 与当前客户端配置不匹配"
      );
    }
    const codeVerifier = await this.decryptVerifier(transaction);
    const verifiedPrincipal = await this.dependencies.provider.exchangeCode({
      requestId: params.requestId,
      issuer: transaction.issuer,
      clientId: transaction.clientId,
      audience: configuration.audience,
      redirectUri: transaction.redirectUri,
      code: params.code,
      codeVerifier,
      expectedNonceDigest: transaction.nonceDigest,
    });
    assertPrincipalMatches(verifiedPrincipal, configuration);
    const principal: VerifiedSsoPrincipal = {
      ...verifiedPrincipal,
      issuer: normalizeSsoIssuer(verifiedPrincipal.issuer, configuration),
    };
    return { principal, transaction, configuration };
  }

  private async getConfiguration(): Promise<SsoClientConfiguration> {
    const raw = await this.dependencies.configuration();
    const issuer = normalizeSsoIssuer(raw.issuer, raw);
    if (!raw.clientId.trim() || !raw.audience.trim() || !raw.tenantId.trim()) {
      throw new SsoError(
        SsoErrorCode.INVALID_REQUEST,
        "SSO 客户端或租户配置无效"
      );
    }
    return { ...raw, issuer };
  }

  private async requireEnabledUser(userId: number): Promise<LocalSsoUser> {
    const user = await this.dependencies.repository.findLocalUser(userId);
    if (!user || !user.isEnabled) {
      throw new SsoError(
        SsoErrorCode.ACCOUNT_DISABLED,
        "关联的本地账号不存在或已停用"
      );
    }
    return user;
  }

  private assertBindingAvailability(
    userId: number,
    principal: VerifiedSsoPrincipal,
    existingBySubject: SsoBinding | null,
    existingByUser: SsoBinding | null,
    configuration: SsoClientConfiguration
  ): void {
    if (existingBySubject && existingBySubject.userId !== userId) {
      throw new SsoError(
        SsoErrorCode.BINDING_CONFLICT,
        "此 SSO 身份已被其他本地用户绑定"
      );
    }
    if (existingByUser && existingByUser.subject !== principal.subject) {
      throw new SsoError(
        SsoErrorCode.BINDING_CONFLICT,
        "当前本地用户已绑定其他 SSO 身份"
      );
    }
    const existing = existingBySubject ?? existingByUser;
    if (existing) {
      assertPrincipalMatchesBinding(principal, existing, {
        allowInsecureLocalhost: configuration.allowInsecureLocalhost,
      });
    }
  }

  private toNewBinding(
    userId: number,
    principal: VerifiedSsoPrincipal,
    now: number
  ): NewSsoBinding {
    return {
      userId,
      issuer: principal.issuer,
      subject: principal.subject,
      principalUserId: principal.userId,
      tenantId: principal.tenantId,
      membershipId: principal.membershipId,
      clientId: principal.clientId,
      amr: [...principal.amr],
      scope: [...principal.scope],
      createTimeUtc: now,
      updateTimeUtc: null,
    };
  }

  private async encryptVerifier(
    transactionId: string,
    codeVerifier: string
  ): Promise<string> {
    try {
      return await this.dependencies.cipher.encrypt(
        codeVerifier,
        ssoTransactionAad(transactionId)
      );
    } catch {
      throw new SsoError(
        SsoErrorCode.SENSITIVE_DATA_FAILURE,
        "SSO PKCE verifier 加密失败"
      );
    }
  }

  private async decryptVerifier(transaction: SsoTransaction): Promise<string> {
    try {
      return await this.dependencies.cipher.decrypt(
        transaction.encryptedCodeVerifier,
        ssoTransactionAad(transaction.id)
      );
    } catch {
      throw new SsoError(
        SsoErrorCode.SENSITIVE_DATA_FAILURE,
        "SSO PKCE verifier 解密失败"
      );
    }
  }
}
