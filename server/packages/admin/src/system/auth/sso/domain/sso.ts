export const SSO_INTENTS = ["login", "bind"] as const;
export type SsoIntent = (typeof SSO_INTENTS)[number];

export const SSO_CONNECTION_STATUSES = ["draft", "ready", "disabled"] as const;
export type SsoConnectionStatus = (typeof SSO_CONNECTION_STATUSES)[number];

export const SsoErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ISSUER: "INVALID_ISSUER",
  INVALID_REDIRECT_URI: "INVALID_REDIRECT_URI",
  INVALID_PKCE: "INVALID_PKCE",
  INVALID_STATE: "INVALID_STATE",
  PRINCIPAL_MISMATCH: "PRINCIPAL_MISMATCH",
  ACCOUNT_NOT_BOUND: "ACCOUNT_NOT_BOUND",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  BINDING_CONFLICT: "BINDING_CONFLICT",
  BINDING_NOT_FOUND: "BINDING_NOT_FOUND",
  SENSITIVE_DATA_FAILURE: "SENSITIVE_DATA_FAILURE",
  CONFIGURATION_INVALID: "CONFIGURATION_INVALID",
  CONFIGURATION_NOT_READY: "CONFIGURATION_NOT_READY",
  CONFIGURATION_CONFLICT: "CONFIGURATION_CONFLICT",
} as const;

export type SsoErrorCode = (typeof SsoErrorCode)[keyof typeof SsoErrorCode];

export class SsoError extends Error {
  constructor(
    readonly code: SsoErrorCode,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, SsoError.prototype);
  }
}

export type SsoIssuerPolicy = {
  allowInsecureLocalhost: boolean;
};

export type SsoClientConfiguration = SsoIssuerPolicy & {
  issuer: string;
  clientId: string;
  audience: string;
  tenantId: string;
  redirectUris: readonly string[];
};

export type SsoConnection = {
  id: "default";
  issuer: string;
  clientId: string;
  audience: string;
  allowedTenantId: string;
  redirectUris: readonly string[];
  status: SsoConnectionStatus;
  configVersion: number;
  lastTestedAtUtc: number | null;
  updatedByUserId: number | null;
  createTimeUtc: number;
  updateTimeUtc: number | null;
};

export type SsoConnectionValues = Pick<
  SsoConnection,
  "issuer" | "clientId" | "audience" | "allowedTenantId" | "redirectUris"
>;

export type S256PkceInput = {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
};

export type VerifiedSsoPrincipal = {
  issuer: string;
  subject: string;
  userId: string;
  tenantId: string;
  membershipId: string;
  clientId: string;
  amr: readonly string[];
  scope: readonly string[];
};

export type LocalSsoUser = {
  id: number;
  username: string;
  langCode: string;
  isEnabled: boolean;
};

export type SsoBinding = {
  id: number;
  userId: number;
  issuer: string;
  subject: string;
  principalUserId: string;
  tenantId: string;
  membershipId: string;
  clientId: string;
  amr: readonly string[];
  scope: readonly string[];
  createTimeUtc: number;
  updateTimeUtc: number | null;
};

export type SsoTransaction = {
  id: string;
  stateDigest: string;
  intent: SsoIntent;
  expectedUserId: number | null;
  issuer: string;
  clientId: string;
  tenantId: string;
  redirectUri: string;
  encryptedCodeVerifier: string;
  nonceDigest: string;
  expiresAtUtc: number;
  consumedAtUtc: number | null;
  createTimeUtc: number;
};

const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

export function parseSsoIntent(value: string): SsoIntent {
  if (value === "login" || value === "bind") return value;
  throw new SsoError(SsoErrorCode.INVALID_REQUEST, "不支持的 SSO 操作");
}

export function normalizeSsoIssuer(
  value: string,
  policy: SsoIssuerPolicy
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SsoError(SsoErrorCode.INVALID_ISSUER, "SSO issuer 无效");
  }

  const isLocalhost = isLoopbackHostname(url.hostname);
  const secure = url.protocol === "https:";
  const allowedLocalDevelopment =
    url.protocol === "http:" && isLocalhost && policy.allowInsecureLocalhost;
  if (!secure && !allowedLocalDevelopment) {
    throw new SsoError(
      SsoErrorCode.INVALID_ISSUER,
      "SSO issuer 必须使用 HTTPS"
    );
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && url.protocol !== "http:")
  ) {
    throw new SsoError(SsoErrorCode.INVALID_ISSUER, "SSO issuer 格式无效");
  }

  const normalizedPath = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${normalizedPath}`;
}

export function normalizeSsoConnectionValues(
  values: SsoConnectionValues,
  policy: SsoIssuerPolicy
): SsoConnectionValues {
  const clientId = requireConfigurationValue(values.clientId, "clientId");
  const audience = requireConfigurationValue(values.audience, "audience");
  const allowedTenantId = requireConfigurationValue(
    values.allowedTenantId,
    "allowedTenantId"
  );
  if (values.redirectUris.length === 0 || values.redirectUris.length > 10) {
    throw new SsoError(
      SsoErrorCode.CONFIGURATION_INVALID,
      "SSO 回调地址数量无效"
    );
  }
  const redirectUris = values.redirectUris.map((value) =>
    normalizeConfiguredRedirectUri(value, policy)
  );
  if (new Set(redirectUris).size !== redirectUris.length) {
    throw new SsoError(
      SsoErrorCode.CONFIGURATION_INVALID,
      "SSO 回调地址不能重复"
    );
  }
  return {
    issuer: normalizeSsoIssuer(values.issuer, policy),
    clientId,
    audience,
    allowedTenantId,
    redirectUris,
  };
}

export function toSsoClientConfiguration(
  connection: SsoConnection,
  policy: SsoIssuerPolicy
): SsoClientConfiguration {
  if (connection.status !== "ready") {
    throw new SsoError(
      SsoErrorCode.CONFIGURATION_NOT_READY,
      "SSO 连接尚未就绪"
    );
  }
  return createSsoClientConfiguration(connection, policy);
}

export function createSsoClientConfiguration(
  values: SsoConnectionValues,
  policy: SsoIssuerPolicy
): SsoClientConfiguration {
  const normalized = normalizeSsoConnectionValues(values, policy);
  return {
    issuer: normalized.issuer,
    clientId: normalized.clientId,
    audience: normalized.audience,
    tenantId: normalized.allowedTenantId,
    redirectUris: normalized.redirectUris,
    allowInsecureLocalhost: policy.allowInsecureLocalhost,
  };
}

export function validateSsoRedirectUri(
  value: string,
  configuration: SsoClientConfiguration
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SsoError(SsoErrorCode.INVALID_REDIRECT_URI, "SSO 回调地址无效");
  }
  const isLocalDevelopment =
    url.protocol === "http:" &&
    isLoopbackHostname(url.hostname) &&
    configuration.allowInsecureLocalhost;
  if (url.protocol !== "https:" && !isLocalDevelopment) {
    throw new SsoError(
      SsoErrorCode.INVALID_REDIRECT_URI,
      "SSO 回调地址必须使用 HTTPS"
    );
  }
  const normalized = url.toString();
  if (!configuration.redirectUris.includes(normalized)) {
    throw new SsoError(
      SsoErrorCode.INVALID_REDIRECT_URI,
      "SSO 回调地址不在允许列表中"
    );
  }
  return normalized;
}

export function createS256PkceInput(
  codeVerifier: string,
  codeChallenge: string
): S256PkceInput {
  if (
    !PKCE_VERIFIER_PATTERN.test(codeVerifier) ||
    !isBase64Url(codeChallenge) ||
    codeChallenge.length !== 43
  ) {
    throw new SsoError(SsoErrorCode.INVALID_PKCE, "S256 PKCE 输入无效");
  }
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}

export function ssoTransactionAad(transactionId: string): string {
  return `system_sso_oidc_transaction:${transactionId}:pkce-verifier`;
}

export function assertPrincipalMatches(
  principal: VerifiedSsoPrincipal,
  expected: Pick<
    SsoClientConfiguration,
    "issuer" | "clientId" | "tenantId" | "allowInsecureLocalhost"
  >
): void {
  const issuer = normalizeSsoIssuer(principal.issuer, expected);
  const expectedIssuer = normalizeSsoIssuer(expected.issuer, expected);
  if (
    issuer !== expectedIssuer ||
    principal.clientId !== expected.clientId ||
    principal.tenantId !== expected.tenantId ||
    !principal.subject.trim() ||
    !principal.userId.trim() ||
    !principal.membershipId.trim()
  ) {
    throw new SsoError(
      SsoErrorCode.PRINCIPAL_MISMATCH,
      "SSO 主体与客户端配置不匹配"
    );
  }
}

export function assertPrincipalMatchesBinding(
  principal: VerifiedSsoPrincipal,
  binding: SsoBinding,
  policy: SsoIssuerPolicy
): void {
  const principalIssuer = normalizeSsoIssuer(principal.issuer, policy);
  if (
    principalIssuer !== binding.issuer ||
    principal.subject !== binding.subject ||
    principal.userId !== binding.principalUserId ||
    principal.tenantId !== binding.tenantId ||
    principal.membershipId !== binding.membershipId ||
    principal.clientId !== binding.clientId
  ) {
    throw new SsoError(
      SsoErrorCode.PRINCIPAL_MISMATCH,
      "SSO 主体与本地绑定不匹配"
    );
  }
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function normalizeConfiguredRedirectUri(
  value: string,
  policy: SsoIssuerPolicy
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SsoError(SsoErrorCode.CONFIGURATION_INVALID, "SSO 回调地址无效");
  }
  const allowedLocalDevelopment =
    url.protocol === "http:" &&
    isLoopbackHostname(url.hostname) &&
    policy.allowInsecureLocalhost;
  if (
    (url.protocol !== "https:" && !allowedLocalDevelopment) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new SsoError(
      SsoErrorCode.CONFIGURATION_INVALID,
      "SSO 回调地址格式不安全"
    );
  }
  return url.toString();
}

function requireConfigurationValue(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 512) {
    throw new SsoError(
      SsoErrorCode.CONFIGURATION_INVALID,
      `SSO ${field} 配置无效`
    );
  }
  return normalized;
}

function isBase64Url(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}
