import { getEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import { SsoCenter } from "../application/sso-center.js";
import type { SsoClientConfiguration } from "../domain/sso.js";
import { normalizeSsoIssuer } from "../domain/sso.js";
import {
  webCryptoSsoCipher,
  webCryptoSsoHash,
  webCryptoSsoRandom,
} from "./crypto.js";
import {
  createSsoOidcProvider,
  type SsoOidcOutboundLogEvent,
} from "./oidc-provider.js";
import { drizzleSsoRepository } from "./repository.js";

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

function parseRedirectUris(
  raw: string,
  allowInsecureLocalhost: boolean
): readonly string[] {
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new SsoConfigurationError(
      "SSO_ALLOWED_REDIRECT_URIS must contain at least one URI"
    );
  }

  const normalized = values.map((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new SsoConfigurationError(
        "SSO_ALLOWED_REDIRECT_URIS contains an invalid URI"
      );
    }
    const isLoopback =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";
    const allowsDevelopmentHttp =
      allowInsecureLocalhost && url.protocol === "http:" && isLoopback;
    if (
      (url.protocol !== "https:" && !allowsDevelopmentHttp) ||
      url.username ||
      url.password ||
      url.hash
    ) {
      throw new SsoConfigurationError(
        "SSO_ALLOWED_REDIRECT_URIS contains an unsafe URI"
      );
    }
    return url.toString();
  });

  if (new Set(normalized).size !== normalized.length) {
    throw new SsoConfigurationError(
      "SSO_ALLOWED_REDIRECT_URIS contains duplicate URIs"
    );
  }
  return normalized;
}

export function resolveSsoConfiguration(): SsoClientConfiguration {
  const allowInsecureLocalhost = getEnv("NODE_ENV") !== "production";
  const issuer = requireEnvironmentValue("SSO_ISSUER");
  const clientId = requireEnvironmentValue("SSO_CLIENT_ID");
  const audience = requireEnvironmentValue("SSO_AUDIENCE");
  const tenantId = requireEnvironmentValue("SSO_ALLOWED_TENANT_ID");
  const redirectUris = parseRedirectUris(
    requireEnvironmentValue("SSO_ALLOWED_REDIRECT_URIS"),
    allowInsecureLocalhost
  );
  requireEnvironmentValue("OAUTH_SENSITIVE_DATA_KEY");

  try {
    return {
      issuer: normalizeSsoIssuer(issuer, { allowInsecureLocalhost }),
      clientId,
      audience,
      tenantId,
      redirectUris,
      allowInsecureLocalhost,
    };
  } catch {
    throw new SsoConfigurationError("SSO_ISSUER is invalid or unsafe");
  }
}

function logOidcOutbound(event: SsoOidcOutboundLogEvent): void {
  console.log(JSON.stringify(event));
}

let center: SsoCenter | null = null;

export function getSsoCenter(): SsoCenter {
  if (!center) {
    center = new SsoCenter({
      repository: drizzleSsoRepository,
      provider: createSsoOidcProvider({ log: logOidcOutbound }),
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
      configuration: resolveSsoConfiguration,
    });
  }
  return center;
}
