import type { SsoConfigurationRepositoryPort } from "../application/ports.js";
import {
  SsoError,
  SsoErrorCode,
  toSsoClientConfiguration,
  type SsoClientConfiguration,
  type SsoIssuerPolicy,
} from "../domain/sso.js";

export type DatabaseSsoConfigurationOptions = {
  repository: SsoConfigurationRepositoryPort;
  policy: SsoIssuerPolicy;
};

export function createDatabaseSsoConfigurationResolver(
  options: DatabaseSsoConfigurationOptions
): () => Promise<SsoClientConfiguration> {
  return async () => {
    const connection = await options.repository.findConnection();
    if (!connection) {
      throw new SsoError(
        SsoErrorCode.CONFIGURATION_NOT_READY,
        "SSO 连接尚未配置"
      );
    }
    return toSsoClientConfiguration(connection, options.policy);
  };
}
