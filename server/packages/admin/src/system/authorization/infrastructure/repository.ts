import db from "@hodor/core/db/index";
import { and, eq } from "drizzle-orm";
import type { AuthorizationConnectionRepositoryPort } from "../application/ports.js";
import type { AuthorizationConnection } from "../domain/authorization.js";
import { authorizationConnectionTable } from "../model.js";

type AuthorizationConnectionRow =
  typeof authorizationConnectionTable.$inferSelect;

function toConnection(
  row: AuthorizationConnectionRow
): AuthorizationConnection {
  return {
    id: row.id,
    issuer: row.issuer,
    authorizationBaseUrl: row.authorizationBaseUrl,
    audience: row.audience,
    clientId: row.clientId,
    encryptedClientSecret: row.encryptedClientSecret,
    cloudflareAccessClientId: row.cloudflareAccessClientId,
    encryptedCloudflareAccessClientSecret:
      row.encryptedCloudflareAccessClientSecret,
    status: row.status,
    configVersion: row.configVersion,
    lastTestedAtUtc: row.lastTestedAtUtc,
    updatedByUserId: row.updatedByUserId,
    createTimeUtc: row.createTimeUtc,
    updateTimeUtc: row.updateTimeUtc,
  };
}

export class DrizzleAuthorizationConnectionRepository implements AuthorizationConnectionRepositoryPort {
  async findConnection(): Promise<AuthorizationConnection | null> {
    const rows = await db
      .select()
      .from(authorizationConnectionTable)
      .where(eq(authorizationConnectionTable.id, "default"))
      .limit(1);
    return rows[0] ? toConnection(rows[0]) : null;
  }

  async saveDraft(
    input: Parameters<AuthorizationConnectionRepositoryPort["saveDraft"]>[0]
  ): Promise<AuthorizationConnection | null> {
    const nextVersion = input.expectedVersion + 1;
    if (input.expectedVersion === 0) {
      const rows = await db
        .insert(authorizationConnectionTable)
        .values({
          id: "default",
          issuer: input.values.issuer,
          authorizationBaseUrl: input.values.authorizationBaseUrl,
          audience: input.values.audience,
          clientId: input.values.clientId,
          encryptedClientSecret: input.encryptedClientSecret,
          cloudflareAccessClientId: input.values.cloudflareAccessClientId,
          encryptedCloudflareAccessClientSecret:
            input.encryptedCloudflareAccessClientSecret,
          status: "draft",
          configVersion: nextVersion,
          lastTestedAtUtc: null,
          updatedByUserId: input.updatedByUserId,
          createTimeUtc: input.nowUtc,
          updateTimeUtc: null,
        })
        .onConflictDoNothing({ target: authorizationConnectionTable.id })
        .returning();
      return rows[0] ? toConnection(rows[0]) : null;
    }

    const rows = await db
      .update(authorizationConnectionTable)
      .set({
        issuer: input.values.issuer,
        authorizationBaseUrl: input.values.authorizationBaseUrl,
        audience: input.values.audience,
        clientId: input.values.clientId,
        encryptedClientSecret: input.encryptedClientSecret,
        cloudflareAccessClientId: input.values.cloudflareAccessClientId,
        encryptedCloudflareAccessClientSecret:
          input.encryptedCloudflareAccessClientSecret,
        status: "draft",
        configVersion: nextVersion,
        lastTestedAtUtc: null,
        updatedByUserId: input.updatedByUserId,
        updateTimeUtc: input.nowUtc,
      })
      .where(
        and(
          eq(authorizationConnectionTable.id, "default"),
          eq(authorizationConnectionTable.configVersion, input.expectedVersion)
        )
      )
      .returning();
    return rows[0] ? toConnection(rows[0]) : null;
  }

  async markReady(
    input: Parameters<AuthorizationConnectionRepositoryPort["markReady"]>[0]
  ): Promise<AuthorizationConnection | null> {
    const rows = await db
      .update(authorizationConnectionTable)
      .set({
        status: "ready",
        configVersion: input.expectedVersion + 1,
        lastTestedAtUtc: input.testedAtUtc,
        updatedByUserId: input.updatedByUserId,
        updateTimeUtc: input.testedAtUtc,
      })
      .where(
        and(
          eq(authorizationConnectionTable.id, "default"),
          eq(authorizationConnectionTable.configVersion, input.expectedVersion),
          eq(authorizationConnectionTable.status, "draft")
        )
      )
      .returning();
    return rows[0] ? toConnection(rows[0]) : null;
  }

  async disable(
    input: Parameters<AuthorizationConnectionRepositoryPort["disable"]>[0]
  ): Promise<AuthorizationConnection | null> {
    const rows = await db
      .update(authorizationConnectionTable)
      .set({
        status: "disabled",
        configVersion: input.expectedVersion + 1,
        updatedByUserId: input.updatedByUserId,
        updateTimeUtc: input.nowUtc,
      })
      .where(
        and(
          eq(authorizationConnectionTable.id, "default"),
          eq(authorizationConnectionTable.configVersion, input.expectedVersion)
        )
      )
      .returning();
    return rows[0] ? toConnection(rows[0]) : null;
  }
}

export const drizzleAuthorizationConnectionRepository =
  new DrizzleAuthorizationConnectionRepository();
