import type {
  AuthorizationConnection,
  AuthorizationConnectionValues,
  AuthorizationDecisionInput,
  AuthorizationDecisionResult,
  HodorAuthorizationActor,
} from "../domain/authorization.js";
import {
  attachHodorActor,
  createAuthorizationConnectionValues,
  HodorAuthorizationError,
  HodorAuthorizationErrorCode,
  validateAuthorizationClientSecret,
} from "../domain/authorization.js";
import type {
  AuthorizationCenterDependencies,
  AuthorizationShadowObservation,
} from "./ports.js";

const CLIENT_SECRET_AAD =
  "system_authorization_connection:default:client_secret:v1";
const CLOUDFLARE_ACCESS_CLIENT_SECRET_AAD =
  "system_authorization_connection:default:cloudflare_access_client_secret:v1";

export interface SaveAuthorizationConnectionInput {
  readonly values: AuthorizationConnectionValues;
  readonly clientSecret?: string;
  readonly cloudflareAccessClientSecret?: string;
  readonly expectedVersion: number;
  readonly updatedByUserId: number;
}

export class AuthorizationCenter {
  constructor(private readonly dependencies: AuthorizationCenterDependencies) {}

  getConnection(): Promise<AuthorizationConnection | null> {
    return this.dependencies.repository.findConnection();
  }

  async saveDraft(
    input: SaveAuthorizationConnectionInput
  ): Promise<AuthorizationConnection> {
    const values = createAuthorizationConnectionValues(input.values, {
      allowInsecureLocalhost: this.dependencies.allowInsecureLocalhost,
    });
    const current = await this.dependencies.repository.findConnection();
    if (
      input.expectedVersion < 0 ||
      (current === null && input.expectedVersion !== 0) ||
      (current !== null && current.configVersion !== input.expectedVersion)
    ) {
      return this.configurationConflict();
    }

    let encryptedClientSecret = current?.encryptedClientSecret;
    if (input.clientSecret !== undefined) {
      const secret = validateAuthorizationClientSecret(input.clientSecret);
      try {
        encryptedClientSecret = await this.dependencies.cipher.encrypt(
          secret,
          CLIENT_SECRET_AAD
        );
      } catch {
        throw new HodorAuthorizationError(
          HodorAuthorizationErrorCode.CREDENTIAL_FAILURE,
          "Authorization Client Secret 加密失败"
        );
      }
    }
    if (encryptedClientSecret === undefined) {
      throw new HodorAuthorizationError(
        HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
        "首次保存必须提供 Client Secret"
      );
    }

    let encryptedCloudflareAccessClientSecret =
      current?.encryptedCloudflareAccessClientSecret ?? null;
    if (values.cloudflareAccessClientId === null) {
      encryptedCloudflareAccessClientSecret = null;
    } else if (input.cloudflareAccessClientSecret !== undefined) {
      const accessSecret = validateAuthorizationClientSecret(
        input.cloudflareAccessClientSecret
      );
      try {
        encryptedCloudflareAccessClientSecret =
          await this.dependencies.cipher.encrypt(
            accessSecret,
            CLOUDFLARE_ACCESS_CLIENT_SECRET_AAD
          );
      } catch {
        throw new HodorAuthorizationError(
          HodorAuthorizationErrorCode.CREDENTIAL_FAILURE,
          "Cloudflare Access Client Secret 加密失败"
        );
      }
    } else if (
      encryptedCloudflareAccessClientSecret === null ||
      current?.cloudflareAccessClientId !== values.cloudflareAccessClientId
    ) {
      throw new HodorAuthorizationError(
        HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
        "首次启用或更换 Cloudflare Access Client ID 时必须提供 Secret"
      );
    }

    const saved = await this.dependencies.repository.saveDraft({
      values,
      encryptedClientSecret,
      encryptedCloudflareAccessClientSecret,
      expectedVersion: input.expectedVersion,
      updatedByUserId: input.updatedByUserId,
      nowUtc: this.dependencies.clock.now(),
    });
    return saved ?? this.configurationConflict();
  }

  async testConnection(input: {
    readonly expectedVersion: number;
    readonly updatedByUserId: number;
    readonly requestId: string;
  }): Promise<AuthorizationConnection> {
    const connection = await this.requireConnection(
      input.expectedVersion,
      "draft"
    );
    const clientSecret = await this.decryptClientSecret(connection);
    const cloudflareAccess =
      await this.decryptCloudflareAccessCredentials(connection);
    await this.dependencies.gateway.testConnection({
      connection,
      clientSecret,
      cloudflareAccess,
      requestId: input.requestId,
    });
    const testedAtUtc = this.dependencies.clock.now();
    const ready = await this.dependencies.repository.markReady({
      expectedVersion: input.expectedVersion,
      updatedByUserId: input.updatedByUserId,
      testedAtUtc,
    });
    return ready ?? this.configurationConflict();
  }

  async disableConnection(input: {
    readonly expectedVersion: number;
    readonly updatedByUserId: number;
  }): Promise<AuthorizationConnection> {
    await this.requireConnection(input.expectedVersion);
    const disabled = await this.dependencies.repository.disable({
      expectedVersion: input.expectedVersion,
      updatedByUserId: input.updatedByUserId,
      nowUtc: this.dependencies.clock.now(),
    });
    return disabled ?? this.configurationConflict();
  }

  async checkPilotDecision(input: {
    readonly decision: AuthorizationDecisionInput;
    readonly actor: HodorAuthorizationActor;
    readonly requestId: string;
  }): Promise<AuthorizationDecisionResult> {
    const connection = await this.requireReadyConnection();
    const clientSecret = await this.decryptClientSecret(connection);
    const cloudflareAccess =
      await this.decryptCloudflareAccessCredentials(connection);
    return this.dependencies.gateway.checkDecision({
      connection,
      clientSecret,
      cloudflareAccess,
      requestId: input.requestId,
      decision: attachHodorActor(input.decision, input.actor),
    });
  }

  /**
   * Best-effort policy comparison used during migrations. Every failure is
   * converted into an unavailable observation so the protected business path
   * keeps its existing RBAC result.
   */
  async observeShadowDecision(input: {
    readonly decision: AuthorizationDecisionInput;
    readonly actor: HodorAuthorizationActor;
    readonly requestId: string;
    readonly rbacAllowed: boolean;
  }): Promise<AuthorizationShadowObservation> {
    const startedAt = this.dependencies.clock.now();
    let observation: AuthorizationShadowObservation;
    try {
      const result = await this.checkPilotDecision(input);
      observation = {
        requestId: input.requestId,
        rbacAllowed: input.rbacAllowed,
        abacAllowed: result.data.allowed,
        comparison:
          input.rbacAllowed === result.data.allowed ? "match" : "mismatch",
        outcome: "evaluated",
        decisionId: result.data.decisionId,
        policyRevision: result.data.policyRevision,
        durationMs: Math.max(0, this.dependencies.clock.now() - startedAt),
      };
    } catch {
      observation = {
        requestId: input.requestId,
        rbacAllowed: input.rbacAllowed,
        abacAllowed: null,
        comparison: "unavailable",
        outcome: "unavailable",
        decisionId: null,
        policyRevision: null,
        durationMs: Math.max(0, this.dependencies.clock.now() - startedAt),
      };
    }
    await this.recordShadowObservation(observation);
    return observation;
  }

  private async requireConnection(
    expectedVersion: number,
    expectedStatus?: AuthorizationConnection["status"]
  ): Promise<AuthorizationConnection> {
    const connection = await this.dependencies.repository.findConnection();
    if (
      connection === null ||
      connection.configVersion !== expectedVersion ||
      (expectedStatus !== undefined && connection.status !== expectedStatus)
    ) {
      return this.configurationConflict();
    }
    return connection;
  }

  private async requireReadyConnection(): Promise<AuthorizationConnection> {
    const connection = await this.dependencies.repository.findConnection();
    if (connection === null || connection.status !== "ready") {
      throw new HodorAuthorizationError(
        HodorAuthorizationErrorCode.CONFIGURATION_NOT_READY,
        "Authorization 配置尚未就绪"
      );
    }
    return connection;
  }

  private async decryptClientSecret(
    connection: AuthorizationConnection
  ): Promise<string> {
    try {
      return validateAuthorizationClientSecret(
        await this.dependencies.cipher.decrypt(
          connection.encryptedClientSecret,
          CLIENT_SECRET_AAD
        )
      );
    } catch {
      throw new HodorAuthorizationError(
        HodorAuthorizationErrorCode.CREDENTIAL_FAILURE,
        "Authorization Client Secret 解密失败"
      );
    }
  }

  private async decryptCloudflareAccessCredentials(
    connection: AuthorizationConnection
  ): Promise<{
    readonly clientId: string;
    readonly clientSecret: string;
  } | null> {
    if (connection.cloudflareAccessClientId === null) return null;
    if (connection.encryptedCloudflareAccessClientSecret === null) {
      throw new HodorAuthorizationError(
        HodorAuthorizationErrorCode.CREDENTIAL_FAILURE,
        "Cloudflare Access Client Secret 缺失"
      );
    }
    try {
      return {
        clientId: connection.cloudflareAccessClientId,
        clientSecret: validateAuthorizationClientSecret(
          await this.dependencies.cipher.decrypt(
            connection.encryptedCloudflareAccessClientSecret,
            CLOUDFLARE_ACCESS_CLIENT_SECRET_AAD
          )
        ),
      };
    } catch {
      throw new HodorAuthorizationError(
        HodorAuthorizationErrorCode.CREDENTIAL_FAILURE,
        "Cloudflare Access Client Secret 解密失败"
      );
    }
  }

  private configurationConflict(): never {
    throw new HodorAuthorizationError(
      HodorAuthorizationErrorCode.CONFIGURATION_CONFLICT,
      "Authorization 配置版本或状态已变化"
    );
  }

  private async recordShadowObservation(
    observation: AuthorizationShadowObservation
  ): Promise<void> {
    try {
      await this.dependencies.shadowLog.record(observation);
    } catch {
      // Shadow logging must never affect the protected business operation.
    }
  }
}
