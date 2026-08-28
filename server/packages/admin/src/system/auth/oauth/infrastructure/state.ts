import db from "@hodor/core/db/index";
import { and, eq, gt, isNotNull, isNull, lte, or } from "drizzle-orm";

import type { OAuthStatePort } from "../application/ports.js";
import type { OAuthStateRecord } from "../domain/oauth.js";
import { oauthStateTable } from "../model.js";

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export const drizzleOAuthStateAdapter: OAuthStatePort = {
  async create(record: OAuthStateRecord) {
    const state = randomState();
    await db.insert(oauthStateTable).values({
      stateDigest: await stateDigest(state),
      provider: record.provider,
      intent: record.intent,
      redirectUri: record.redirectUri,
      userId: record.userId,
      expiresAtUtc: record.expiresAtUtc,
      consumedAtUtc: null,
    });
    return state;
  },
  async consume(state: string, consumedAtUtc: number) {
    const rows = await db
      .update(oauthStateTable)
      .set({ consumedAtUtc })
      .where(
        and(
          eq(oauthStateTable.stateDigest, await stateDigest(state)),
          isNull(oauthStateTable.consumedAtUtc),
          gt(oauthStateTable.expiresAtUtc, consumedAtUtc)
        )
      )
      .returning();
    return rows[0] ? toRecord(rows[0]) : null;
  },
  async deleteRetired(nowUtc: number) {
    const rows = await db
      .delete(oauthStateTable)
      .where(
        or(
          lte(oauthStateTable.expiresAtUtc, nowUtc),
          isNotNull(oauthStateTable.consumedAtUtc)
        )
      )
      .returning({ stateDigest: oauthStateTable.stateDigest });
    return rows.length;
  },
};

async function stateDigest(state: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(state)
  );
  let binary = "";
  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function toRecord(row: typeof oauthStateTable.$inferSelect): OAuthStateRecord {
  return {
    provider: row.provider,
    intent: row.intent,
    redirectUri: row.redirectUri,
    userId: row.userId,
    expiresAtUtc: row.expiresAtUtc,
  };
}
