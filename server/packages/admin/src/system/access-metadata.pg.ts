import { eq, sql, type SQL } from "drizzle-orm";
import { withPostgresTransaction } from "@hodor/core/db/postgresql/runtime";
import { postgresNowMilliseconds } from "@hodor/core/db/postgresql/sql";
import { userTable } from "./user/schema.pg";
import { roleTable } from "./role/schema.pg";
import { apiTokenTable } from "./api-token/schema.pg";
import { currentUserPermissionSql } from "./soft-delete-authorization.pg";

/** Legacy text JSON remains text; corrupt values grant no capabilities. */
function permissionsArray() {
  return sql`CASE WHEN pg_input_is_valid(${apiTokenTable.permissions}, 'jsonb')
    THEN CASE WHEN jsonb_typeof(${apiTokenTable.permissions}::jsonb) = 'array'
      THEN ${apiTokenTable.permissions}::jsonb ELSE '[]'::jsonb END
    ELSE '[]'::jsonb END`;
}

export const postgresSystemAccess = {
  currentUserPermissionSql,
  platformAdminSql(id: number | SQL): SQL {
    const roles = sql`CASE WHEN jsonb_typeof(${userTable.roleIdArr}) = 'array'
      THEN ${userTable.roleIdArr} ELSE '[]'::jsonb END`;
    return sql`EXISTS (SELECT 1 FROM ${userTable}
      WHERE ${userTable.id} = ${id} AND ${userTable.isEnabled}
        AND ${roles} @> '[1]'::jsonb
        AND EXISTS (SELECT 1 FROM ${roleTable} WHERE ${roleTable.id} = 1
          AND ${roleTable.isEnabled} AND NOT ${roleTable.isDeleted}))`;
  },
  userActiveSql(id: number | SQL): SQL {
    return sql`EXISTS (SELECT 1 FROM ${userTable}
      WHERE ${userTable.id} = ${id} AND ${userTable.isEnabled})`;
  },
  tokenOwnedBySql(tokenId: number | SQL, userId: number | SQL): SQL {
    return sql`EXISTS (SELECT 1 FROM ${apiTokenTable}
      WHERE ${apiTokenTable.id} = ${tokenId} AND ${apiTokenTable.creatorId} = ${userId})`;
  },
  tokenUsableSql(id: number | SQL, permission?: string): SQL {
    const now = postgresNowMilliseconds();
    return sql`EXISTS (SELECT 1 FROM ${apiTokenTable}
      WHERE ${apiTokenTable.id} = ${id} AND ${apiTokenTable.status} = 'active'
        AND (${apiTokenTable.startTimeUtc} IS NULL OR ${apiTokenTable.startTimeUtc} <= ${now})
        AND (${apiTokenTable.expireTimeUtc} IS NULL OR ${apiTokenTable.expireTimeUtc} > ${now})
        ${permission ? sql`AND ${permissionsArray()} @> jsonb_build_array(${permission}::text)` : sql``})`;
  },
  async getUserMetadata(id: number) {
    return withPostgresTransaction(async (database) => {
      const [user] = await database
        .select({
          id: userTable.id,
          username: userTable.username,
          isEnabled: userTable.isEnabled,
        })
        .from(userTable)
        .where(eq(userTable.id, id))
        .limit(1);
      return user ?? null;
    });
  },
  async getApiTokenMetadata(id: number) {
    return withPostgresTransaction(async (database) => {
      const [token] = await database
        .select({
          id: apiTokenTable.id,
          creatorId: apiTokenTable.creatorId,
          status: apiTokenTable.status,
          startTimeUtc: apiTokenTable.startTimeUtc,
          expireTimeUtc: apiTokenTable.expireTimeUtc,
          permissions: apiTokenTable.permissions,
        })
        .from(apiTokenTable)
        .where(eq(apiTokenTable.id, id))
        .limit(1);
      return token ?? null;
    });
  },
};
