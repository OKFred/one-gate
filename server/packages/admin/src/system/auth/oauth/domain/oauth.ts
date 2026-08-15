export const OAUTH_PROVIDERS = ["github", "feishu"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_INTENTS = ["login", "bind", "unbind"] as const;
export type OAuthIntent = (typeof OAUTH_INTENTS)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type OAuthStateRecord = {
  provider: OAuthProvider;
  intent: OAuthIntent;
  redirectUri: string;
  userId: number | null;
  expiresAtUtc: number;
};

export type OAuthCredentials = {
  accessToken: string;
  refreshToken?: string;
  scopes: string[];
  expiresAtUtc?: number;
};

export type VerifiedOAuthIdentity = {
  provider: OAuthProvider;
  providerId: string;
  providerUsername: string | null;
  providerTenantId: string | null;
  profile: JsonObject;
  credentials: OAuthCredentials;
};

export type OAuthBinding = {
  id: number;
  userId: number;
  provider: OAuthProvider;
  providerId: string;
  providerUsername: string | null;
  providerTenantId: string | null;
  encryptedProfile: string | null;
  encryptedAccessToken: string | null;
  encryptedRefreshToken: string | null;
  scopes: string[] | null;
  tokenExpiresAtUtc: number | null;
  lastVerifiedAtUtc: number | null;
};

export type LocalOAuthUser = {
  id: number;
  username: string;
  langCode: string;
  isEnabled: boolean;
};

export const OAuthErrorCode = {
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_STATE: "INVALID_STATE",
  INVALID_REDIRECT_URI: "INVALID_REDIRECT_URI",
  PROVIDER_NOT_CONFIGURED: "PROVIDER_NOT_CONFIGURED",
  PROVIDER_REJECTED: "PROVIDER_REJECTED",
  ELIGIBILITY_REJECTED: "ELIGIBILITY_REJECTED",
  ACCOUNT_NOT_BOUND: "ACCOUNT_NOT_BOUND",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  BINDING_CONFLICT: "BINDING_CONFLICT",
  BINDING_NOT_FOUND: "BINDING_NOT_FOUND",
  REVOKE_FAILED: "REVOKE_FAILED",
  SENSITIVE_DATA_FAILURE: "SENSITIVE_DATA_FAILURE",
} as const;

export type OAuthErrorCode =
  (typeof OAuthErrorCode)[keyof typeof OAuthErrorCode];

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    message: string
  ) {
    super(message);
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

export function parseOAuthProvider(value: string): OAuthProvider {
  if (value === "github" || value === "feishu") return value;
  throw new OAuthError(
    OAuthErrorCode.INVALID_REQUEST,
    "不支持的 OAuth Provider"
  );
}

export function parseAccountIntent(value?: string): "bind" | "unbind" {
  if (value === undefined || value === "bind") return "bind";
  if (value === "unbind") return "unbind";
  throw new OAuthError(OAuthErrorCode.INVALID_REQUEST, "不支持的 OAuth 操作");
}

export function validateRedirectUri(
  redirectUri: string,
  allowedOrigins: readonly string[]
): string {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new OAuthError(
      OAuthErrorCode.INVALID_REDIRECT_URI,
      "OAuth 回调地址无效"
    );
  }
  if (!allowedOrigins.includes(url.origin)) {
    throw new OAuthError(
      OAuthErrorCode.INVALID_REDIRECT_URI,
      "OAuth 回调地址不在允许列表中"
    );
  }
  if (url.pathname !== "/oauth/callback") {
    throw new OAuthError(
      OAuthErrorCode.INVALID_REDIRECT_URI,
      "OAuth 回调路径必须为 /oauth/callback"
    );
  }
  return url.toString();
}

export function sensitiveAad(
  binding: Pick<OAuthBinding, "userId" | "provider" | "providerId">,
  field: "profile" | "access-token" | "refresh-token"
): string {
  return `system_user_oauth:${binding.userId}:${binding.provider}:${binding.providerId}:${field}`;
}

export function isFeishuAccountActive(profile: JsonObject): boolean {
  const status = profile.status;
  if (!status || Array.isArray(status) || typeof status !== "object") {
    return false;
  }
  const isActivated = status.is_activated;
  const isFrozen = status.is_frozen;
  const isResigned = status.is_resigned;
  const isExited = status.is_exited;
  const isUnjoin = status.is_unjoin;
  return (
    isActivated === true &&
    isFrozen !== true &&
    isResigned !== true &&
    isExited !== true &&
    isUnjoin !== true
  );
}
