import { getEnv } from "@hodor/core/utils/env";
import { AuthorizationCenter } from "../application/authorization-center.js";
import { webCryptoAuthorizationCipher } from "./crypto.js";
import {
  createOneAuthorizationGateway,
  type AuthorizationOutboundLogEvent,
} from "./one-authorization-gateway.js";
import { drizzleAuthorizationConnectionRepository } from "./repository.js";

export interface CreateAuthorizationCenterOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly log?: (event: AuthorizationOutboundLogEvent) => Promise<void> | void;
  readonly allowInsecureLocalhost?: boolean;
}

function defaultLog(event: AuthorizationOutboundLogEvent): void {
  console.log(JSON.stringify(event));
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
    allowInsecureLocalhost:
      options.allowInsecureLocalhost ?? getEnv("NODE_ENV") !== "production",
  });
}
