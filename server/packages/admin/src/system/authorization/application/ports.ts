import type {
  AuthorizationConnection,
  AuthorizationConnectionValues,
  AuthorizationDecisionInput,
  AuthorizationDecisionResult,
} from "../domain/authorization.js";

export interface AuthorizationConnectionRepositoryPort {
  findConnection(): Promise<AuthorizationConnection | null>;
  saveDraft(input: {
    readonly values: AuthorizationConnectionValues;
    readonly encryptedClientSecret: string;
    readonly encryptedCloudflareAccessClientSecret: string | null;
    readonly expectedVersion: number;
    readonly updatedByUserId: number;
    readonly nowUtc: number;
  }): Promise<AuthorizationConnection | null>;
  markReady(input: {
    readonly expectedVersion: number;
    readonly updatedByUserId: number;
    readonly testedAtUtc: number;
  }): Promise<AuthorizationConnection | null>;
  disable(input: {
    readonly expectedVersion: number;
    readonly updatedByUserId: number;
    readonly nowUtc: number;
  }): Promise<AuthorizationConnection | null>;
}

export interface AuthorizationCredentialCipherPort {
  encrypt(plaintext: string, aad: string): Promise<string>;
  decrypt(ciphertext: string, aad: string): Promise<string>;
}

export interface AuthorizationGatewayAccessCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface AuthorizationGatewayPort {
  testConnection(input: {
    readonly connection: AuthorizationConnectionValues;
    readonly clientSecret: string;
    readonly cloudflareAccess: AuthorizationGatewayAccessCredentials | null;
    readonly requestId: string;
  }): Promise<void>;
  checkDecision(input: {
    readonly connection: AuthorizationConnectionValues;
    readonly clientSecret: string;
    readonly cloudflareAccess: AuthorizationGatewayAccessCredentials | null;
    readonly requestId: string;
    readonly decision: AuthorizationDecisionInput;
  }): Promise<AuthorizationDecisionResult>;
}

export interface AuthorizationClockPort {
  now(): number;
}

export interface AuthorizationCenterDependencies {
  readonly repository: AuthorizationConnectionRepositoryPort;
  readonly cipher: AuthorizationCredentialCipherPort;
  readonly gateway: AuthorizationGatewayPort;
  readonly clock: AuthorizationClockPort;
  readonly allowInsecureLocalhost: boolean;
}
