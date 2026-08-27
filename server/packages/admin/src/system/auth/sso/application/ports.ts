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
  consumeTransaction(
    stateDigest: string,
    consumedAtUtc: number
  ): Promise<SsoTransaction | null>;
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
    issuer: string;
    clientId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    pkce: Pick<S256PkceInput, "codeChallenge" | "codeChallengeMethod">;
  }): Promise<string>;
  exchangeCode(input: {
    issuer: string;
    clientId: string;
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
