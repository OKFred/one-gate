import { getEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import { SsoCenter } from "../application/sso-center.js";
import { SsoConfigurationCenter } from "../application/sso-configuration-center.js";
import { createDatabaseSsoConfigurationResolver } from "./configuration.js";
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
      configuration: createDatabaseSsoConfigurationResolver({
        repository: drizzleSsoConfigurationRepository,
        policy,
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
