import { getEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import { SsoCenter } from "../application/sso-center.js";
import { SsoConfigurationCenter } from "../application/sso-configuration-center.js";
import type { SsoClientConfiguration } from "../domain/sso.js";
import { createSsoClientConfiguration } from "../domain/sso.js";
import { createDatabaseFirstSsoConfigurationResolver } from "./configuration.js";
import {
  webCryptoSsoCipher,
  webCryptoSsoHash,
  webCryptoSsoRandom,
} from "./crypto.js";
import {
  createSsoOidcProvider,
  type SsoOidcOutboundLogEvent,
} from "./oidc-provider.js";
import {
  drizzleSsoConfigurationRepository,
  drizzleSsoRepository,
} from "./repository.js";

export class SsoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsoConfigurationError";
  }
}

function requireEnvironmentValue(name: string): string {
  const value = getEnv(name)?.trim();
  if (!value) throw new SsoConfigurationError(`${name} is required`);
  return value;
}

function parseRedirectUris(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resolveSsoConfiguration(): SsoClientConfiguration {
  const allowInsecureLocalhost = getEnv("NODE_ENV") !== "production";
  const issuer = requireEnvironmentValue("SSO_ISSUER");
  const clientId = requireEnvironmentValue("SSO_CLIENT_ID");
  const audience = requireEnvironmentValue("SSO_AUDIENCE");
  const tenantId = requireEnvironmentValue("SSO_ALLOWED_TENANT_ID");
  const redirectUris = parseRedirectUris(
    requireEnvironmentValue("SSO_ALLOWED_REDIRECT_URIS")
  );

  try {
    return createSsoClientConfiguration(
      {
        issuer,
        clientId,
        audience,
        allowedTenantId: tenantId,
        redirectUris,
      },
      { allowInsecureLocalhost }
    );
  } catch {
    throw new SsoConfigurationError("Legacy SSO configuration is invalid");
  }
}

function logOidcOutbound(event: SsoOidcOutboundLogEvent): void {
  console.log(JSON.stringify(event));
}

let center: SsoCenter | null = null;
let configurationCenter: SsoConfigurationCenter | null = null;

function allowInsecureLocalhost(): boolean {
  return getEnv("NODE_ENV") !== "production";
}

const oidcProvider = createSsoOidcProvider({ log: logOidcOutbound });

export function getSsoCenter(): SsoCenter {
  if (!center) {
    const policy = { allowInsecureLocalhost: allowInsecureLocalhost() };
    center = new SsoCenter({
      repository: drizzleSsoRepository,
      provider: oidcProvider,
      clock: { now: () => Date.now() },
      idGenerator: { nextId: () => crypto.randomUUID() },
      random: webCryptoSsoRandom,
      hash: webCryptoSsoHash,
      cipher: webCryptoSsoCipher,
      tokenIssuer: {
        issue: async ({ user }) =>
          tokenUtils.generateToken({
            userId: user.id,
            username: user.username,
          }),
      },
      configuration: createDatabaseFirstSsoConfigurationResolver({
        repository: drizzleSsoConfigurationRepository,
        policy,
        legacyConfiguration: resolveSsoConfiguration,
      }),
    });
  }
  return center;
}

export function getSsoConfigurationCenter(): SsoConfigurationCenter {
  if (!configurationCenter) {
    configurationCenter = new SsoConfigurationCenter({
      repository: drizzleSsoConfigurationRepository,
      probe: oidcProvider,
      clock: { now: () => Date.now() },
      policy: { allowInsecureLocalhost: allowInsecureLocalhost() },
    });
  }
  return configurationCenter;
}
