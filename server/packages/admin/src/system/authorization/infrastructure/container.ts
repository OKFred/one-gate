import { getEnv } from "@hodor/core/utils/env";
import { AuthorizationCenter } from "../application/authorization-center.js";
import type {
  AuthorizationShadowLogPort,
  AuthorizationShadowObservation,
} from "../application/ports.js";
import { webCryptoAuthorizationCipher } from "./crypto.js";
import {
  createOneAuthorizationGateway,
  type AuthorizationOutboundLogEvent,
} from "./one-authorization-gateway.js";
import { drizzleAuthorizationConnectionRepository } from "./repository.js";

export interface CreateAuthorizationCenterOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly log?: (event: AuthorizationOutboundLogEvent) => Promise<void> | void;
  readonly shadowLog?: AuthorizationShadowLogPort;
  readonly allowInsecureLocalhost?: boolean;
}

function defaultLog(event: AuthorizationOutboundLogEvent): void {
  console.log(JSON.stringify(event));
}

function defaultShadowLog(observation: AuthorizationShadowObservation): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level:
        observation.comparison === "match" &&
        observation.outcome === "evaluated"
          ? "info"
          : "warn",
      service: "hodor-server",
      event: "authorization.shadow.completed",
      ...observation,
    })
  );
}

export function createAuthorizationCenter(
  options: CreateAuthorizationCenterOptions = {}
): AuthorizationCenter {
  return new AuthorizationCenter({
    repository: drizzleAuthorizationConnectionRepository,
    cipher: webCryptoAuthorizationCipher,
    gateway: createOneAuthorizationGateway({
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      log: options.log ?? defaultLog,
    }),
    clock: { now: () => Date.now() },
    shadowLog: options.shadowLog ?? { record: defaultShadowLog },
    allowInsecureLocalhost:
      options.allowInsecureLocalhost ?? getEnv("NODE_ENV") !== "production",
  });
}

let defaultCenter: AuthorizationCenter | null = null;

export function getAuthorizationCenter(): AuthorizationCenter {
  defaultCenter ??= createAuthorizationCenter();
  return defaultCenter;
}
