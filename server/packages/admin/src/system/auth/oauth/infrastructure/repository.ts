import db from "@hodor/core/db/index";
import { and, eq, type InferInsertModel } from "drizzle-orm";
import { userOauthTable, userTable } from "../../../user/model.js";
import {
  parseOAuthProvider,
  type OAuthBinding,
  type OAuthProvider,
} from "../domain/oauth.js";
import type {
  OAuthBindingRepositoryPort,
  SaveOAuthBinding,
} from "../application/ports.js";

type OAuthBindingRow = typeof userOauthTable.$inferSelect;

function toBinding(row: OAuthBindingRow): OAuthBinding {
  return {
    id: row.id,
    userId: row.userId,
    provider: parseOAuthProvider(row.provider),
    providerId: row.providerId,
    providerUsername: row.providerUsername,
    providerTenantId: row.providerTenantId,
    encryptedProfile: row.encryptedProfile,
    encryptedAccessToken: row.encryptedAccessToken,
    encryptedRefreshToken: row.encryptedRefreshToken,
    scopes: row.scopes,
    tokenExpiresAtUtc: row.tokenExpiresAtUtc,
    lastVerifiedAtUtc: row.lastVerifiedAtUtc,
  };
}

function toInsert(binding: SaveOAuthBinding) {
  return binding satisfies Omit<
    InferInsertModel<typeof userOauthTable>,
    "id" | "createTimeUtc" | "updateTimeUtc"
  >;
}

export class DrizzleOAuthBindingRepository implements OAuthBindingRepositoryPort {
  async findByIdentity(provider: OAuthProvider, providerId: string) {
    const rows = await db
      .select()
      .from(userOauthTable)
      .where(
        and(
          eq(userOauthTable.provider, provider),
          eq(userOauthTable.providerId, providerId)
        )
      )
      .limit(1);
    return rows[0] ? toBinding(rows[0]) : null;
  }

  async findByUserAndProvider(userId: number, provider: OAuthProvider) {
    const rows = await db
      .select()
      .from(userOauthTable)
      .where(
        and(
          eq(userOauthTable.userId, userId),
          eq(userOauthTable.provider, provider)
        )
      )
      .limit(1);
    return rows[0] ? toBinding(rows[0]) : null;
  }

  async listByUser(userId: number): Promise<OAuthBinding[]> {
    const rows = await db
      .select()
      .from(userOauthTable)
      .where(eq(userOauthTable.userId, userId));
    return rows.map(toBinding);
  }

  async insert(binding: SaveOAuthBinding): Promise<number> {
    const rows = await db
      .insert(userOauthTable)
      .values({ ...toInsert(binding), createTimeUtc: Date.now() })
      .returning({ id: userOauthTable.id });
    return rows[0].id;
  }

  async update(id: number, binding: SaveOAuthBinding): Promise<void> {
    await db
      .update(userOauthTable)
      .set({ ...toInsert(binding), updateTimeUtc: Date.now() })
      .where(eq(userOauthTable.id, id));
  }

  async deleteByUserAndProvider(
    userId: number,
    provider: OAuthProvider
  ): Promise<void> {
    await db
      .delete(userOauthTable)
      .where(
        and(
          eq(userOauthTable.userId, userId),
          eq(userOauthTable.provider, provider)
        )
      );
  }

  async findLocalUser(userId: number) {
    const rows = await db
      .select({
        id: userTable.id,
        username: userTable.username,
        langCode: userTable.langCode,
        isEnabled: userTable.isEnabled,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    return rows[0] ?? null;
  }
}

export const drizzleOAuthBindingRepository =
  new DrizzleOAuthBindingRepository();
