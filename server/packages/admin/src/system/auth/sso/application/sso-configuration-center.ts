import {
  createSsoClientConfiguration,
  normalizeSsoConnectionValues,
  SsoError,
  SsoErrorCode,
  type SsoConnection,
  type SsoConnectionValues,
  type SsoIssuerPolicy,
} from "../domain/sso.js";
import type {
  SsoClockPort,
  SsoConfigurationProbePort,
  SsoConfigurationRepositoryPort,
} from "./ports.js";

export type SsoConfigurationCenterDependencies = {
  repository: SsoConfigurationRepositoryPort;
  probe: SsoConfigurationProbePort;
  clock: SsoClockPort;
  policy: SsoIssuerPolicy;
};

export class SsoConfigurationCenter {
  constructor(
    private readonly dependencies: SsoConfigurationCenterDependencies
  ) {}

  get(): Promise<SsoConnection | null> {
    return this.dependencies.repository.findConnection();
  }

  async saveDraft(input: {
    values: SsoConnectionValues;
    expectedVersion: number;
    updatedByUserId: number;
  }): Promise<SsoConnection> {
    assertVersion(input.expectedVersion, true);
    assertUserId(input.updatedByUserId);
    const values = normalizeSsoConnectionValues(
      input.values,
      this.dependencies.policy
    );
    const connection = await this.dependencies.repository.saveDraft({
      values,
      expectedVersion: input.expectedVersion,
      updatedByUserId: input.updatedByUserId,
      nowUtc: this.dependencies.clock.now(),
    });
    return requireUpdatedConnection(connection);
  }

  async test(input: {
    expectedVersion: number;
    updatedByUserId: number;
    requestId: string;
  }): Promise<SsoConnection> {
    assertVersion(input.expectedVersion, false);
    assertUserId(input.updatedByUserId);
    const connection = await this.dependencies.repository.findConnection();
    if (
      !connection ||
      connection.status !== "draft" ||
      connection.configVersion !== input.expectedVersion
    ) {
      throw configurationConflict();
    }
    const configuration = createSsoClientConfiguration(
      connection,
      this.dependencies.policy
    );
    await this.dependencies.probe.testConfiguration({
      requestId: input.requestId,
      configuration,
    });
    const ready = await this.dependencies.repository.markReady({
      expectedVersion: input.expectedVersion,
      updatedByUserId: input.updatedByUserId,
      testedAtUtc: this.dependencies.clock.now(),
    });
    return requireUpdatedConnection(ready);
  }

  async disable(input: {
    expectedVersion: number;
    updatedByUserId: number;
  }): Promise<SsoConnection> {
    assertVersion(input.expectedVersion, false);
    assertUserId(input.updatedByUserId);
    const disabled = await this.dependencies.repository.disable({
      expectedVersion: input.expectedVersion,
      updatedByUserId: input.updatedByUserId,
      nowUtc: this.dependencies.clock.now(),
    });
    return requireUpdatedConnection(disabled);
  }
}

function assertVersion(value: number, allowCreate: boolean): void {
  const minimum = allowCreate ? 0 : 1;
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new SsoError(SsoErrorCode.CONFIGURATION_INVALID, "SSO 配置版本无效");
  }
}

function assertUserId(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new SsoError(
      SsoErrorCode.CONFIGURATION_INVALID,
      "SSO 配置修改者无效"
    );
  }
}

function requireUpdatedConnection(
  connection: SsoConnection | null
): SsoConnection {
  if (!connection) throw configurationConflict();
  return connection;
}

function configurationConflict(): SsoError {
  return new SsoError(
    SsoErrorCode.CONFIGURATION_CONFLICT,
    "SSO 配置已被其他操作修改，请刷新后重试"
  );
}
