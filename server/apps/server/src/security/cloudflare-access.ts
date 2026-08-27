import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

import {
  classifyAccessRoute,
  getAccessDeploymentDecision,
} from "@hodor/core/middleware/accessRoutePolicy/index.js";
import type { App, Context } from "@hodor/core/types/app.js";
import { getEnv } from "@hodor/core/utils/env.js";

const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";
const ACCESS_VALIDATION_SWITCH = "HODOR_ACCESS_ORIGIN_VALIDATION_ENABLED";

type AccessAuthOutcome =
  | "allowed"
  | "bypassed_machine"
  | "bypassed_websocket"
  | "bypassed_preflight"
  | "disabled_non_production"
  | "denied_missing"
  | "denied_invalid"
  | "denied_configuration";

export interface CloudflareAccessConfig {
  readonly issuer: string;
  readonly audience: string;
}

export interface CloudflareAccessLogEvent {
  readonly timestamp: string;
  readonly level: "info" | "warn" | "error";
  readonly service: "hodor-server";
  readonly event: "access.origin.authorization";
  readonly requestId: string;
  readonly authMethod: "cloudflare-access";
  readonly authOutcome: AccessAuthOutcome;
}

export interface CloudflareAccessLogger {
  write(event: CloudflareAccessLogEvent): void;
}

export interface CloudflareAccessMiddlewareOptions {
  readonly verifyAssertion?: (
    assertion: string,
    config: CloudflareAccessConfig
  ) => Promise<void>;
  readonly logger?: CloudflareAccessLogger;
  readonly now?: () => Date;
}

const defaultLogger: CloudflareAccessLogger = {
  write(event): void {
    const line = JSON.stringify(event);
    if (event.level === "error") {
      console.error(line);
      return;
    }
    if (event.level === "warn") {
      console.warn(line);
      return;
    }
    console.log(line);
  },
};

function normalizeTeamDomain(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    const candidate = trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveCloudflareAccessConfig():
  | CloudflareAccessConfig
  | undefined {
  const issuer = normalizeTeamDomain(getEnv("CF_ACCESS_TEAM_DOMAIN"));
  const audience = getEnv("CF_ACCESS_APPLICATION_AUDIENCE")?.trim();
  return issuer && audience ? { issuer, audience } : undefined;
}

export function isCloudflareAccessValidationEnabled(): boolean {
  if (getEnv("NODE_ENV") === "production") return true;
  return getEnv(ACCESS_VALIDATION_SWITCH)?.trim().toLowerCase() === "true";
}

export function stripBaseApiPath(
  requestPath: string,
  baseApiPath: string
): string | undefined {
  if (!baseApiPath.startsWith("/") || baseApiPath.endsWith("/")) {
    return undefined;
  }
  if (requestPath === baseApiPath) return "/";
  if (!requestPath.startsWith(`${baseApiPath}/`)) return undefined;
  return requestPath.slice(baseApiPath.length);
}

export function resolveAccessRequirement(
  requestPath: string,
  baseApiPath: string
): "required" | "machine-bypass" | "websocket-bypass" | "not-applicable" {
  const policyPath = stripBaseApiPath(requestPath, baseApiPath);
  if (!policyPath?.startsWith("/admin/")) return "not-applicable";

  const classification = classifyAccessRoute(policyPath);
  if (classification === "machineAccessBypass") return "machine-bypass";
  if (classification === "websocketAccessBypass") return "websocket-bypass";

  // The blocked legacy callback deliberately remains protected at the origin.
  // Its manifest deployment decision stays `block`; it must never become bypass.
  if (classification === "blockedLegacyUnauthenticated") {
    if (getAccessDeploymentDecision(policyPath) !== "block") {
      return "required";
    }
  }
  return "required";
}

export function createCloudflareAccessJwtVerifier(
  config: CloudflareAccessConfig,
  jwks: JWTVerifyGetKey = createRemoteJWKSet(
    new URL(`${config.issuer}/cdn-cgi/access/certs`)
  )
): (assertion: string) => Promise<void> {
  return async (assertion): Promise<void> => {
    const { payload } = await jwtVerify(assertion, jwks, {
      algorithms: ["RS256"],
      issuer: config.issuer,
      audience: config.audience,
    });
    if (typeof payload.exp !== "number") {
      throw new Error("Cloudflare Access assertion is missing exp");
    }
  };
}

function writeAuthLog(
  context: Context,
  outcome: AccessAuthOutcome,
  logger: CloudflareAccessLogger,
  now: () => Date
): void {
  const level = outcome.startsWith("denied_")
    ? outcome === "denied_configuration"
      ? "error"
      : "warn"
    : "info";
  logger.write({
    timestamp: now().toISOString(),
    level,
    service: "hodor-server",
    event: "access.origin.authorization",
    requestId: context.get("requestId"),
    authMethod: "cloudflare-access",
    authOutcome: outcome,
  });
}

function denyAccess(context: Context, requestId: string): Response {
  return context.json(
    {
      ok: false,
      message: "Cloudflare Access origin authorization failed",
      data: { requestId },
    },
    403
  );
}

export function registerCloudflareAccessOrigin(
  app: App,
  options: CloudflareAccessMiddlewareOptions = {}
): void {
  const baseApiPath = getEnv("BASE_API_PATH") || "";
  const logger = options.logger ?? defaultLogger;
  const now = options.now ?? (() => new Date());
  let cachedDefaultVerifier:
    | {
        readonly issuer: string;
        readonly audience: string;
        readonly verify: (assertion: string) => Promise<void>;
      }
    | undefined;

  app.use(`${baseApiPath}/admin/*`, async (context, next) => {
    const requestId = context.get("requestId");
    if (context.req.method === "OPTIONS") {
      writeAuthLog(context, "bypassed_preflight", logger, now);
      await next();
      return;
    }

    const requirement = resolveAccessRequirement(context.req.path, baseApiPath);
    if (requirement === "machine-bypass") {
      writeAuthLog(context, "bypassed_machine", logger, now);
      await next();
      return;
    }
    if (requirement === "websocket-bypass") {
      writeAuthLog(context, "bypassed_websocket", logger, now);
      await next();
      return;
    }
    if (!isCloudflareAccessValidationEnabled()) {
      writeAuthLog(context, "disabled_non_production", logger, now);
      await next();
      return;
    }

    const config = resolveCloudflareAccessConfig();
    if (!config) {
      writeAuthLog(context, "denied_configuration", logger, now);
      return denyAccess(context, requestId);
    }

    const assertion = context.req.header(ACCESS_ASSERTION_HEADER);
    if (!assertion) {
      writeAuthLog(context, "denied_missing", logger, now);
      return denyAccess(context, requestId);
    }

    try {
      if (options.verifyAssertion) {
        await options.verifyAssertion(assertion, config);
      } else {
        if (
          cachedDefaultVerifier?.issuer !== config.issuer ||
          cachedDefaultVerifier.audience !== config.audience
        ) {
          cachedDefaultVerifier = {
            ...config,
            verify: createCloudflareAccessJwtVerifier(config),
          };
        }
        await cachedDefaultVerifier.verify(assertion);
      }
    } catch {
      writeAuthLog(context, "denied_invalid", logger, now);
      return denyAccess(context, requestId);
    }

    writeAuthLog(context, "allowed", logger, now);
    await next();
  });
}
