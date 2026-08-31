import type { AuthorizationGatewayPort } from "../application/ports.js";
import type {
  AuthorizationDecisionResult,
  AuthorizationConnectionValues,
} from "../domain/authorization.js";
import {
  HodorAuthorizationError,
  HodorAuthorizationErrorCode,
} from "../domain/authorization.js";

const REQUEST_TIMEOUT_MS = 10_000;
const DECISION_SCOPE = "authorization:decide";
const MAX_ACCESS_TOKEN_LENGTH = 16_384;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

type UnknownRecord = Readonly<Record<string, unknown>>;

export interface AuthorizationOutboundLogEvent {
  readonly timestamp: string;
  readonly level: "info" | "warn";
  readonly service: "hodor-server";
  readonly event: "authorization.outbound.completed";
  readonly requestId: string;
  readonly operation: "decision" | "discovery" | "readiness" | "token";
  readonly method: "GET" | "POST";
  readonly upstreamHost: string;
  readonly upstreamPath: string;
  readonly status?: number;
  readonly durationMs: number;
  readonly outcome: "failure" | "rejected" | "success";
}

export interface CreateOneAuthorizationGatewayOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly log?: (event: AuthorizationOutboundLogEvent) => Promise<void> | void;
}

interface OidcDiscovery {
  readonly tokenEndpoint: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function upstreamError(
  code:
    | typeof HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE
    | typeof HodorAuthorizationErrorCode.UPSTREAM_REJECTED
    | typeof HodorAuthorizationErrorCode.UPSTREAM_UNAVAILABLE,
  message: string
): never {
  throw new HodorAuthorizationError(code, message);
}

function requireJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase();
  if (contentType === undefined || !contentType.includes("application/json")) {
    return upstreamError(
      HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
      "Authorization 上游未返回 JSON"
    );
  }
  return response
    .json()
    .catch(() =>
      upstreamError(
        HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
        "Authorization 上游 JSON 无效"
      )
    );
}

function validateTokenEndpoint(value: unknown, issuer: string): string {
  if (typeof value !== "string") {
    return upstreamError(
      HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
      "OIDC discovery 缺少 token endpoint"
    );
  }
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return upstreamError(
      HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
      "OIDC token endpoint 无效"
    );
  }
  if (
    endpoint.origin !== new URL(issuer).origin ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    return upstreamError(
      HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
      "OIDC token endpoint 不可信"
    );
  }
  return endpoint.toString();
}

function parseDecisionResult(value: unknown): AuthorizationDecisionResult {
  if (!isRecord(value) || !isRecord(value["data"])) {
    return upstreamError(
      HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
      "Authorization 决策响应无效"
    );
  }
  const data = value["data"];
  const requestId = value["requestId"];
  const decisionId = data["decisionId"];
  const allowed = data["allowed"];
  const reason = data["reason"];
  const policyRevision = data["policyRevision"];
  if (
    typeof requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(requestId) ||
    typeof decisionId !== "string" ||
    !IDENTIFIER_PATTERN.test(decisionId) ||
    typeof allowed !== "boolean" ||
    (reason !== "POLICY_ALLOW" && reason !== "POLICY_DENY") ||
    !Number.isSafeInteger(policyRevision) ||
    typeof policyRevision !== "number" ||
    policyRevision <= 0
  ) {
    return upstreamError(
      HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
      "Authorization 决策字段无效"
    );
  }
  return {
    requestId,
    data: { decisionId, allowed, reason, policyRevision },
  };
}

export function createOneAuthorizationGateway(
  options: CreateOneAuthorizationGatewayOptions = {}
): AuthorizationGatewayPort {
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  const emitLog = (
    fields: Omit<
      AuthorizationOutboundLogEvent,
      "event" | "level" | "service" | "timestamp"
    >
  ): void => {
    const event: AuthorizationOutboundLogEvent = {
      timestamp: new Date().toISOString(),
      level: fields.outcome === "success" ? "info" : "warn",
      service: "hodor-server",
      event: "authorization.outbound.completed",
      ...fields,
    };
    try {
      void Promise.resolve(options.log?.(event)).catch(() => undefined);
    } catch {
      // Logging must not affect authorization.
    }
  };

  const auditedFetch = async (
    operation: AuthorizationOutboundLogEvent["operation"],
    requestId: string,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const request = new Request(input, {
      ...init,
      redirect: "error",
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set("x-request-id", requestId);
    const startedAt = Date.now();
    try {
      const response = await fetchImplementation(
        new Request(request, { headers })
      );
      emitLog({
        requestId,
        operation,
        method: request.method === "POST" ? "POST" : "GET",
        upstreamHost: url.host,
        upstreamPath: url.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
        outcome: response.ok ? "success" : "rejected",
      });
      return response;
    } catch {
      emitLog({
        requestId,
        operation,
        method: request.method === "POST" ? "POST" : "GET",
        upstreamHost: url.host,
        upstreamPath: url.pathname,
        durationMs: Date.now() - startedAt,
        outcome: "failure",
      });
      return upstreamError(
        HodorAuthorizationErrorCode.UPSTREAM_UNAVAILABLE,
        "Authorization 上游不可用"
      );
    }
  };

  const discover = async (
    connection: AuthorizationConnectionValues,
    requestId: string
  ): Promise<OidcDiscovery> => {
    const response = await auditedFetch(
      "discovery",
      requestId,
      `${connection.issuer}/.well-known/openid-configuration`,
      { headers: { accept: "application/json" } }
    );
    const payload = await requireJsonResponse(response);
    if (!response.ok) {
      return upstreamError(
        HodorAuthorizationErrorCode.UPSTREAM_REJECTED,
        "OIDC discovery 请求被拒绝"
      );
    }
    if (!isRecord(payload) || payload["issuer"] !== connection.issuer) {
      return upstreamError(
        HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
        "OIDC discovery issuer 不匹配"
      );
    }
    return {
      tokenEndpoint: validateTokenEndpoint(
        payload["token_endpoint"],
        connection.issuer
      ),
    };
  };

  const obtainServiceToken = async (
    connection: AuthorizationConnectionValues,
    clientSecret: string,
    requestId: string
  ): Promise<string> => {
    const discovery = await discover(connection, requestId);
    const response = await auditedFetch(
      "token",
      requestId,
      discovery.tokenEndpoint,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: connection.clientId,
          client_secret: clientSecret,
          scope: DECISION_SCOPE,
          resource: connection.audience,
        }),
      }
    );
    const payload = await requireJsonResponse(response);
    if (!response.ok) {
      return upstreamError(
        HodorAuthorizationErrorCode.UPSTREAM_REJECTED,
        "OIDC Client Credentials 请求被拒绝"
      );
    }
    const accessToken = isRecord(payload) ? payload["access_token"] : null;
    const tokenType = isRecord(payload) ? payload["token_type"] : null;
    if (
      typeof accessToken !== "string" ||
      accessToken.length === 0 ||
      accessToken.length > MAX_ACCESS_TOKEN_LENGTH ||
      typeof tokenType !== "string" ||
      tokenType.toLowerCase() !== "bearer"
    ) {
      return upstreamError(
        HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
        "OIDC token 响应无效"
      );
    }
    return accessToken;
  };

  return {
    async testConnection(input) {
      await obtainServiceToken(
        input.connection,
        input.clientSecret,
        input.requestId
      );
      const response = await auditedFetch(
        "readiness",
        input.requestId,
        `${input.connection.authorizationBaseUrl}/readyz`,
        { headers: { accept: "application/json" } }
      );
      const payload = await requireJsonResponse(response);
      if (!response.ok) {
        return upstreamError(
          HodorAuthorizationErrorCode.UPSTREAM_UNAVAILABLE,
          "Authorization readiness 请求失败"
        );
      }
      if (
        !isRecord(payload) ||
        payload["service"] !== "one-authz" ||
        payload["status"] !== "ready"
      ) {
        return upstreamError(
          HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
          "Authorization 服务尚未就绪"
        );
      }
    },

    async checkDecision(input) {
      const accessToken = await obtainServiceToken(
        input.connection,
        input.clientSecret,
        input.requestId
      );
      const response = await auditedFetch(
        "decision",
        input.requestId,
        `${input.connection.authorizationBaseUrl}/decisions/check`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(input.decision),
        }
      );
      const payload = await requireJsonResponse(response);
      if (!response.ok) {
        return upstreamError(
          response.status >= 500
            ? HodorAuthorizationErrorCode.UPSTREAM_UNAVAILABLE
            : HodorAuthorizationErrorCode.UPSTREAM_REJECTED,
          "Authorization 决策请求失败"
        );
      }
      return parseDecisionResult(payload);
    },
  };
}
