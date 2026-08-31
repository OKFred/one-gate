import type { SsoConfigurationRepositoryPort } from "../application/ports.js";
import {
  toSsoClientConfiguration,
  type SsoClientConfiguration,
  type SsoIssuerPolicy,
} from "../domain/sso.js";

export type DatabaseFirstSsoConfigurationOptions = {
  repository: SsoConfigurationRepositoryPort;
  policy: SsoIssuerPolicy;
  legacyConfiguration: () => SsoClientConfiguration;
};

export function createDatabaseFirstSsoConfigurationResolver(
  options: DatabaseFirstSsoConfigurationOptions
): () => Promise<SsoClientConfiguration> {
  return async () => {
    const connection = await options.repository.findConnection();
    if (!connection) return options.legacyConfiguration();
    return toSsoClientConfiguration(connection, options.policy);
  };
}
