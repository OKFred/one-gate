export const HodorAuthorizationErrorCode = {
  CONFIGURATION_CONFLICT: "AUTHORIZATION_CONFIGURATION_CONFLICT",
  CONFIGURATION_INVALID: "AUTHORIZATION_CONFIGURATION_INVALID",
  CONFIGURATION_NOT_READY: "AUTHORIZATION_CONFIGURATION_NOT_READY",
  CREDENTIAL_FAILURE: "AUTHORIZATION_CREDENTIAL_FAILURE",
  UPSTREAM_INVALID_RESPONSE: "AUTHORIZATION_UPSTREAM_INVALID_RESPONSE",
  UPSTREAM_REJECTED: "AUTHORIZATION_UPSTREAM_REJECTED",
  UPSTREAM_UNAVAILABLE: "AUTHORIZATION_UPSTREAM_UNAVAILABLE",
} as const;

export type HodorAuthorizationErrorCode =
  (typeof HodorAuthorizationErrorCode)[keyof typeof HodorAuthorizationErrorCode];

export class HodorAuthorizationError extends Error {
  constructor(
    readonly code: HodorAuthorizationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "HodorAuthorizationError";
  }
}

export type AuthorizationConnectionStatus = "draft" | "ready" | "disabled";

export interface AuthorizationConnectionValues {
  readonly issuer: string;
  readonly authorizationBaseUrl: string;
  readonly audience: string;
  readonly clientId: string;
  readonly cloudflareAccessClientId: string | null;
}

export interface AuthorizationConnection extends AuthorizationConnectionValues {
  readonly id: "default";
  readonly encryptedClientSecret: string;
  readonly encryptedCloudflareAccessClientSecret: string | null;
  readonly status: AuthorizationConnectionStatus;
  readonly configVersion: number;
  readonly lastTestedAtUtc: number | null;
  readonly updatedByUserId: number;
  readonly createTimeUtc: number;
  readonly updateTimeUtc: number | null;
}

export type CedarInputValue =
  | boolean
  | string
  | number
  | readonly CedarInputValue[]
  | CedarInputRecord;

export interface CedarInputRecord {
  readonly [key: string]: CedarInputValue;
}

export interface AuthorizationDecisionInput {
  readonly action: string;
  readonly resource: {
    readonly type: string;
    readonly id: string;
    readonly attributes: CedarInputRecord;
  };
  readonly context: CedarInputRecord;
}

export interface HodorAuthorizationActor {
  readonly userId: number;
  readonly roleIds: readonly number[];
  readonly isSuperAdmin: boolean;
}

export interface AuthorizationDecisionData {
  readonly decisionId: string;
  readonly allowed: boolean;
  readonly reason: "POLICY_ALLOW" | "POLICY_DENY";
  readonly policyRevision: number;
}

export interface AuthorizationDecisionResult {
  readonly data: AuthorizationDecisionData;
  readonly requestId: string;
}

export interface AuthorizationUrlPolicy {
  readonly allowInsecureLocalhost: boolean;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/u;
const CLIENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MAX_CEDAR_DEPTH = 8;
const MAX_CEDAR_ARRAY_ITEMS = 1_000;
const MAX_CEDAR_STRING_LENGTH = 16_384;
const MAX_CEDAR_RECORD_KEYS = 256;

const invalidConfiguration = (message: string): never => {
  throw new HodorAuthorizationError(
    HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
    message
  );
};

function normalizeSecureUrl(
  value: string,
  label: string,
  policy: AuthorizationUrlPolicy
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalidConfiguration(`${label} 必须是绝对 URL`);
  }
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  if (
    url.protocol !== "https:" &&
    !(policy.allowInsecureLocalhost && loopback && url.protocol === "http:")
  ) {
    return invalidConfiguration(`${label} 必须使用 HTTPS`);
  }
  if (url.username || url.password || url.search || url.hash) {
    return invalidConfiguration(`${label} 不能包含凭证、query 或 fragment`);
  }
  return url.toString().replace(/\/$/u, "");
}

export function createAuthorizationConnectionValues(
  input: AuthorizationConnectionValues,
  policy: AuthorizationUrlPolicy
): AuthorizationConnectionValues {
  const clientId = input.clientId.trim();
  if (!CLIENT_ID.test(clientId)) {
    return invalidConfiguration("Client ID 格式无效");
  }
  const cloudflareAccessClientId =
    input.cloudflareAccessClientId?.trim() ?? null;
  if (
    cloudflareAccessClientId !== null &&
    !CLIENT_ID.test(cloudflareAccessClientId)
  ) {
    return invalidConfiguration("Cloudflare Access Client ID 格式无效");
  }
  return {
    issuer: normalizeSecureUrl(input.issuer.trim(), "Issuer", policy),
    authorizationBaseUrl: normalizeSecureUrl(
      input.authorizationBaseUrl.trim(),
      "Authorization base URL",
      policy
    ),
    audience: normalizeSecureUrl(input.audience.trim(), "Audience", policy),
    clientId,
    cloudflareAccessClientId,
  };
}

export function validateAuthorizationClientSecret(value: string): string {
  if (value.length < 16 || value.length > 4_096) {
    return invalidConfiguration("Client Secret 长度无效");
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCedarValue(value: unknown, depth: number): void {
  if (depth > MAX_CEDAR_DEPTH) {
    return invalidConfiguration("Cedar 输入嵌套过深");
  }
  if (
    typeof value === "boolean" ||
    (typeof value === "string" && value.length <= MAX_CEDAR_STRING_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  ) {
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_CEDAR_ARRAY_ITEMS) {
      return invalidConfiguration("Cedar 数组超过长度限制");
    }
    for (const item of value) validateCedarValue(item, depth + 1);
    return;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > MAX_CEDAR_RECORD_KEYS) {
      return invalidConfiguration("Cedar record 字段过多");
    }
    for (const [key, item] of entries) {
      if (!key || key.length > 128 || key === "__entity" || key === "__extn") {
        return invalidConfiguration("Cedar record 包含无效字段");
      }
      validateCedarValue(item, depth + 1);
    }
    return;
  }
  return invalidConfiguration("Cedar 输入包含不支持的值");
}

export function validateAuthorizationDecisionInput(
  input: AuthorizationDecisionInput
): AuthorizationDecisionInput {
  if (!IDENTIFIER.test(input.action) || !IDENTIFIER.test(input.resource.type)) {
    return invalidConfiguration("Cedar action 或 resource type 格式无效");
  }
  if (!input.resource.id || input.resource.id.length > 512) {
    return invalidConfiguration("Cedar resource ID 格式无效");
  }
  if (
    Object.hasOwn(input.context, "requestTime") ||
    Object.hasOwn(input.context, "hodorActor")
  ) {
    return invalidConfiguration("Cedar context 包含服务端保留字段");
  }
  validateCedarValue(input.resource.attributes, 0);
  validateCedarValue(input.context, 0);
  return input;
}

export function attachHodorActor(
  input: AuthorizationDecisionInput,
  actor: HodorAuthorizationActor
): AuthorizationDecisionInput {
  const roleIds = [...new Set(actor.roleIds)].sort(
    (left, right) => left - right
  );
  if (
    !Number.isSafeInteger(actor.userId) ||
    actor.userId <= 0 ||
    roleIds.some((roleId) => !Number.isSafeInteger(roleId) || roleId <= 0)
  ) {
    return invalidConfiguration("Hodor actor 格式无效");
  }
  const validated = validateAuthorizationDecisionInput(input);
  return {
    ...validated,
    context: {
      ...validated.context,
      hodorActor: {
        userId: String(actor.userId),
        roleIds,
        isSuperAdmin: actor.isSuperAdmin,
      },
    },
  };
}
