import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JWTPayload,
} from "jose";
import type { SsoOidcProviderPort } from "../application/ports.js";
import type { VerifiedSsoPrincipal } from "../domain/sso.js";
import { webCryptoSsoHash } from "./crypto.js";

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_SCOPES = ["openid", "profile", "email"] as const;

type UnknownRecord = Readonly<Record<string, unknown>>;

export type SsoOidcOutboundLogEvent = {
  timestamp: string;
  level: "info" | "warn";
  service: "hodor-server";
  event: "sso.oidc.outbound.completed";
  requestId: string;
  operation: "discovery" | "token" | "jwks";
  method: "GET" | "POST";
  upstreamHost: string;
  upstreamPath: string;
  status?: number;
  durationMs: number;
  outcome: "success" | "rejected" | "failure";
};

export type CreateSsoOidcProviderOptions = {
  scopes?: readonly string[];
  fetch?: typeof globalThis.fetch;
  log?: (event: SsoOidcOutboundLogEvent) => void | Promise<void>;
};

export class SsoOidcProviderError extends Error {
  constructor(
    readonly code:
      | "INVALID_CONFIGURATION"
      | "DISCOVERY_FAILED"
      | "TOKEN_REJECTED"
      | "TOKEN_INVALID",
    message: string
  ) {
    super(message);
    this.name = "SsoOidcProviderError";
  }
}

type OidcDiscovery = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
};

type TokenResponse = {
  accessToken: string;
  idToken: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new SsoOidcProviderError("TOKEN_INVALID", `OIDC ${field} is invalid`);
  }
  return value;
}

function requireClaimString(payload: JWTPayload, claim: string): string {
  return requireNonEmptyString(payload[claim], `claim ${claim}`);
}

function readEquivalentClaim(
  payload: JWTPayload,
  names: readonly string[]
): string {
  const values = names
    .filter((name) => payload[name] !== undefined)
    .map((name) => requireClaimString(payload, name));
  const first = values[0];
  if (!first || values.some((value) => value !== first)) {
    throw new SsoOidcProviderError(
      "TOKEN_INVALID",
      `OIDC claims ${names.join(", ")} are missing or conflict`
    );
  }
  return first;
}

function readStringArray(
  value: unknown,
  claim: string,
  allowSpaceDelimited: boolean
): readonly string[] {
  const items =
    allowSpaceDelimited && typeof value === "string"
      ? value.split(/\s+/u).filter(Boolean)
      : value;
  if (!Array.isArray(items) || items.length === 0) {
    throw new SsoOidcProviderError(
      "TOKEN_INVALID",
      `OIDC claim ${claim} is invalid`
    );
  }
  const result: string[] = [];
  for (const item of items) {
    if (typeof item !== "string" || !item.trim()) {
      throw new SsoOidcProviderError(
        "TOKEN_INVALID",
        `OIDC claim ${claim} contains an invalid value`
      );
    }
    result.push(item);
  }
  return result;
}

function validateEndpoint(
  value: unknown,
  field: string,
  issuer: string
): string {
  const raw = requireNonEmptyString(value, `discovery field ${field}`);
  let endpoint: URL;
  try {
    endpoint = new URL(raw);
  } catch {
    throw new SsoOidcProviderError(
      "DISCOVERY_FAILED",
      `OIDC discovery field ${field} is not an absolute URL`
    );
  }
  if (
    endpoint.origin !== new URL(issuer).origin ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new SsoOidcProviderError(
      "DISCOVERY_FAILED",
      `OIDC discovery field ${field} is not a trusted same-origin endpoint`
    );
  }
  return endpoint.toString();
}

function parseTokenResponse(value: unknown): TokenResponse {
  if (!isRecord(value)) {
    throw new SsoOidcProviderError(
      "TOKEN_INVALID",
      "OIDC token response is invalid"
    );
  }
  const tokenType = value["token_type"];
  if (typeof tokenType !== "string" || tokenType.toLowerCase() !== "bearer") {
    throw new SsoOidcProviderError(
      "TOKEN_INVALID",
      "OIDC token response token type is invalid"
    );
  }
  return {
    accessToken: requireNonEmptyString(value["access_token"], "access token"),
    idToken: requireNonEmptyString(value["id_token"], "ID token"),
  };
}

function parsePrincipal(payload: JWTPayload): VerifiedSsoPrincipal {
  const subject = requireClaimString(payload, "sub");
  const clientId = readEquivalentClaim(payload, [
    "clientId",
    "client_id",
    "azp",
  ]);
  return {
    issuer: requireClaimString(payload, "iss"),
    subject,
    userId: subject,
    tenantId: readEquivalentClaim(payload, ["tenantId", "tenant_id"]),
    membershipId: readEquivalentClaim(payload, [
      "membershipId",
      "membership_id",
    ]),
    clientId,
    amr: readStringArray(payload.amr, "amr", false),
    scope: readStringArray(payload.scope, "scope", true),
  };
}

export function createSsoOidcProvider(
  options: CreateSsoOidcProviderOptions
): SsoOidcProviderPort {
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  if (scopes.length === 0 || scopes.some((scope) => !scope.trim())) {
    throw new SsoOidcProviderError(
      "INVALID_CONFIGURATION",
      "SSO scopes are required"
    );
  }
  const baseFetch = options.fetch ?? globalThis.fetch;

  const auditedFetch = async (
    operation: SsoOidcOutboundLogEvent["operation"],
    requestId: string,
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set("x-request-id", requestId);
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await baseFetch(new Request(request, { headers }));
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
      throw new SsoOidcProviderError(
        operation === "discovery" ? "DISCOVERY_FAILED" : "TOKEN_REJECTED",
        `OIDC ${operation} request failed`
      );
    }
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
  };

  const emitLog = (
    fields: Omit<
      SsoOidcOutboundLogEvent,
      "timestamp" | "level" | "service" | "event"
    >
  ): void => {
    const event: SsoOidcOutboundLogEvent = {
      timestamp: new Date().toISOString(),
      level: fields.outcome === "success" ? "info" : "warn",
      service: "hodor-server",
      event: "sso.oidc.outbound.completed",
      ...fields,
    };
    try {
      void Promise.resolve(options.log?.(event)).catch(() => undefined);
    } catch {
      // Logging must not alter the OIDC result.
    }
  };

  const fetchDiscovery = async (
    issuer: string,
    requestId: string
  ): Promise<OidcDiscovery> => {
    const response = await auditedFetch(
      "discovery",
      requestId,
      `${issuer}/.well-known/openid-configuration`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new SsoOidcProviderError(
        "DISCOVERY_FAILED",
        "OIDC discovery response is invalid"
      );
    }
    if (!response.ok || !isRecord(value)) {
      throw new SsoOidcProviderError(
        "DISCOVERY_FAILED",
        "OIDC discovery request was rejected"
      );
    }
    const discoveredIssuer = requireNonEmptyString(
      value["issuer"],
      "discovery issuer"
    );
    if (discoveredIssuer !== issuer) {
      throw new SsoOidcProviderError(
        "DISCOVERY_FAILED",
        "OIDC discovery issuer does not match configuration"
      );
    }
    const methods = value["code_challenge_methods_supported"];
    if (!Array.isArray(methods) || !methods.includes("S256")) {
      throw new SsoOidcProviderError(
        "DISCOVERY_FAILED",
        "OIDC provider does not advertise S256 PKCE"
      );
    }
    return {
      issuer,
      authorizationEndpoint: validateEndpoint(
        value["authorization_endpoint"],
        "authorization_endpoint",
        issuer
      ),
      tokenEndpoint: validateEndpoint(
        value["token_endpoint"],
        "token_endpoint",
        issuer
      ),
      jwksUri: validateEndpoint(value["jwks_uri"], "jwks_uri", issuer),
    };
  };

  return {
    async createAuthorizationUrl(input) {
      const discovery = await fetchDiscovery(input.issuer, input.requestId);
      const url = new URL(discovery.authorizationEndpoint);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", input.clientId);
      url.searchParams.set("redirect_uri", input.redirectUri);
      url.searchParams.set("scope", scopes.join(" "));
      url.searchParams.set("state", input.state);
      url.searchParams.set("nonce", input.nonce);
      url.searchParams.set("code_challenge", input.pkce.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    },

    async exchangeCode(input) {
      const audience = input.audience.trim();
      if (!audience) {
        throw new SsoOidcProviderError(
          "INVALID_CONFIGURATION",
          "SSO audience is required"
        );
      }
      const discovery = await fetchDiscovery(input.issuer, input.requestId);
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: input.clientId,
        redirect_uri: input.redirectUri,
        code: input.code,
        code_verifier: input.codeVerifier,
        resource: audience,
      });
      const response = await auditedFetch(
        "token",
        input.requestId,
        discovery.tokenEndpoint,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );
      let value: unknown;
      try {
        value = await response.json();
      } catch {
        throw new SsoOidcProviderError(
          "TOKEN_INVALID",
          "OIDC token response is invalid"
        );
      }
      if (!response.ok) {
        throw new SsoOidcProviderError(
          "TOKEN_REJECTED",
          "OIDC token request was rejected"
        );
      }
      const tokens = parseTokenResponse(value);
      const jwksFetch = (jwksInput: RequestInfo | URL, init?: RequestInit) =>
        auditedFetch("jwks", input.requestId, jwksInput, init);
      const resolver = createRemoteJWKSet(new URL(discovery.jwksUri), {
        [customFetch]: jwksFetch,
      });

      let accessPayload: JWTPayload;
      let idPayload: JWTPayload;
      try {
        accessPayload = (
          await jwtVerify(tokens.accessToken, resolver, {
            algorithms: ["EdDSA"],
            issuer: input.issuer,
            audience,
            requiredClaims: ["iss", "aud", "exp", "iat", "sub"],
          })
        ).payload;
        idPayload = (
          await jwtVerify(tokens.idToken, resolver, {
            algorithms: ["EdDSA"],
            issuer: input.issuer,
            audience: input.clientId,
            requiredClaims: ["iss", "aud", "exp", "iat", "sub", "nonce"],
          })
        ).payload;
      } catch {
        throw new SsoOidcProviderError(
          "TOKEN_INVALID",
          "OIDC token verification failed"
        );
      }

      const principal = parsePrincipal(accessPayload);
      const idSubject = requireClaimString(idPayload, "sub");
      const nonce = requireClaimString(idPayload, "nonce");
      const nonceDigest = await webCryptoSsoHash.sha256Base64Url(nonce);
      if (
        idSubject !== principal.subject ||
        nonceDigest !== input.expectedNonceDigest ||
        principal.clientId !== input.clientId
      ) {
        throw new SsoOidcProviderError(
          "TOKEN_INVALID",
          "OIDC token claims do not match the authorization transaction"
        );
      }
      return principal;
    },
  };
}
