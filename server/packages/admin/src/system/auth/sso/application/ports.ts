import type {
  LocalSsoUser,
  S256PkceInput,
  SsoBinding,
  SsoClientConfiguration,
  SsoIntent,
  SsoTransaction,
  VerifiedSsoPrincipal,
} from "../domain/sso.js";

export type NewSsoBinding = Omit<SsoBinding, "id">;
export type SsoBindingCreateResult =
  | { outcome: "created"; bindingId: number }
  | { outcome: "subject_conflict" }
  | { outcome: "user_conflict" };

export interface SsoRepositoryPort {
  createTransaction(transaction: SsoTransaction): Promise<void>;
  /**
   * Atomically marks an unconsumed transaction as consumed and returns it.
   * A missing or previously consumed digest returns null.
   */
  consumeTransaction(input: {
    stateDigest: string;
    expectedIntent: SsoIntent;
    expectedUserId: number | null;
    consumedAtUtc: number;
  }): Promise<SsoTransaction | null>;
  /** Delete consumed or expired transactions before creating another flow. */
  deleteRetiredTransactions(nowUtc: number): Promise<number>;
  findBindingBySubject(
    issuer: string,
    subject: string
  ): Promise<SsoBinding | null>;
  findBindingByUserAndIssuer(
    userId: number,
    issuer: string
  ): Promise<SsoBinding | null>;
  createBinding(binding: NewSsoBinding): Promise<SsoBindingCreateResult>;
  updateBindingVerification(
    bindingId: number,
    principal: VerifiedSsoPrincipal,
    verifiedAtUtc: number
  ): Promise<void>;
  deleteBinding(userId: number, issuer: string): Promise<boolean>;
  findLocalUser(userId: number): Promise<LocalSsoUser | null>;
}

export interface SsoOidcProviderPort {
  createAuthorizationUrl(input: {
    requestId: string;
    issuer: string;
    clientId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    pkce: Pick<S256PkceInput, "codeChallenge" | "codeChallengeMethod">;
  }): Promise<string>;
  exchangeCode(input: {
    requestId: string;
    issuer: string;
    clientId: string;
    audience: string;
    redirectUri: string;
    code: string;
    codeVerifier: string;
    expectedNonceDigest: string;
  }): Promise<VerifiedSsoPrincipal>;
}

export interface SsoClockPort {
  now(): number;
}

export interface SsoIdGeneratorPort {
  nextId(): string;
}

export interface SsoRandomPort {
  randomBase64Url(byteLength: number): string;
}

export interface SsoHashPort {
  sha256Base64Url(value: string): Promise<string>;
}

export interface SsoCipherPort {
  encrypt(plaintext: string, aad: string): Promise<string>;
  decrypt(ciphertext: string, aad: string): Promise<string>;
}

export interface SsoTokenIssuerPort {
  issue(input: {
    user: LocalSsoUser;
    principal: VerifiedSsoPrincipal;
  }): Promise<string>;
}

export type SsoCenterDependencies = {
  repository: SsoRepositoryPort;
  provider: SsoOidcProviderPort;
  clock: SsoClockPort;
  idGenerator: SsoIdGeneratorPort;
  random: SsoRandomPort;
  hash: SsoHashPort;
  cipher: SsoCipherPort;
  tokenIssuer: SsoTokenIssuerPort;
  configuration: () => SsoClientConfiguration;
};

export type CreateSsoAuthorizationInput = {
  intent: SsoIntent;
  redirectUri: string;
  userId: number | null;
};
