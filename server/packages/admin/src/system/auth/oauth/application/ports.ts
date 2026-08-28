import type {
  JsonObject,
  LocalOAuthUser,
  OAuthBinding,
  OAuthIntent,
  OAuthProvider,
  OAuthStateRecord,
  VerifiedOAuthIdentity,
} from "../domain/oauth.js";

export interface OAuthStatePort {
  create(record: OAuthStateRecord): Promise<string>;
  consume(
    state: string,
    consumedAtUtc: number
  ): Promise<OAuthStateRecord | null>;
  deleteRetired(nowUtc: number): Promise<number>;
}

export interface OAuthProviderPort {
  readonly provider: OAuthProvider;
  getAuthorizationUrl(params: { state: string; redirectUri: string }): string;
  exchangeAndVerify(params: {
    code: string;
    redirectUri: string;
    intent: OAuthIntent;
  }): Promise<VerifiedOAuthIdentity>;
  revokeGrant(accessToken: string): Promise<void>;
}

export type SaveOAuthBinding = Omit<OAuthBinding, "id">;

export interface OAuthBindingRepositoryPort {
  findByIdentity(
    provider: OAuthProvider,
    providerId: string
  ): Promise<OAuthBinding | null>;
  findByUserAndProvider(
    userId: number,
    provider: OAuthProvider
  ): Promise<OAuthBinding | null>;
  listByUser(userId: number): Promise<OAuthBinding[]>;
  insert(binding: SaveOAuthBinding): Promise<number>;
  update(id: number, binding: SaveOAuthBinding): Promise<void>;
  deleteByUserAndProvider(
    userId: number,
    provider: OAuthProvider
  ): Promise<void>;
  findLocalUser(userId: number): Promise<LocalOAuthUser | null>;
}

export interface OAuthCipherPort {
  encrypt(plaintext: string, aad: string): Promise<string>;
  decrypt(ciphertext: string, aad: string): Promise<string>;
}

export interface OAuthClockPort {
  now(): number;
}

export interface OAuthTokenIssuerPort {
  issue(user: LocalOAuthUser): string;
}

export type OAuthBindingProfile = {
  provider: OAuthProvider;
  providerId: string;
  providerUsername: string | null;
  providerTenantId: string | null;
  profile: JsonObject;
  lastVerifiedAtUtc: number | null;
};
