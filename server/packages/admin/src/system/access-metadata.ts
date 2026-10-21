import db from "@hodor/core/db/index";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { eq, sql, type SQL } from "drizzle-orm";
import { userTable } from "./user/model";
import { apiTokenTable } from "./api-token/model";
import { roleTable } from "./role/model";

/** Public structural guards keep cross-package writes atomic without exposing private repositories. */
export const systemAccess = {
  platformAdminSql(id: number | SQL): SQL {
    const roles = sql`CASE WHEN json_valid(${userTable.roleIdArr})
      THEN CASE WHEN json_type(${userTable.roleIdArr}) = 'array'
        THEN ${userTable.roleIdArr} ELSE '[]' END ELSE '[]' END`;
    return sql`EXISTS (SELECT 1 FROM ${userTable}
      WHERE ${userTable.id} = ${id} AND ${userTable.isEnabled} = 1
        AND EXISTS (SELECT 1 FROM json_each(${roles}) AS admin_role
          WHERE admin_role.type = 'integer' AND admin_role.value = 1)
        AND EXISTS (SELECT 1 FROM ${roleTable} WHERE ${roleTable.id} = 1
          AND ${roleTable.isEnabled} = 1 AND ${roleTable.isDeleted} = 0))`;
  },

  userActiveSql(id: number | SQL): SQL {
    return sql`EXISTS (SELECT 1 FROM ${userTable}
      WHERE ${userTable.id} = ${id} AND ${userTable.isEnabled} = 1)`;
  },

  tokenOwnedBySql(tokenId: number | SQL, userId: number | SQL): SQL {
    return sql`EXISTS (SELECT 1 FROM ${apiTokenTable}
      WHERE ${apiTokenTable.id} = ${tokenId} AND ${apiTokenTable.creatorId} = ${userId})`;
  },

  tokenUsableSql(id: number | SQL, permission?: string): SQL {
    const now = getCurrentTimestampUtcSql();
    const permissions = sql`CASE WHEN json_valid(${apiTokenTable.permissions})
      THEN CASE WHEN json_type(${apiTokenTable.permissions}) = 'array'
        THEN ${apiTokenTable.permissions} ELSE '[]' END ELSE '[]' END`;
    return sql`EXISTS (SELECT 1 FROM ${apiTokenTable}
      WHERE ${apiTokenTable.id} = ${id} AND ${apiTokenTable.status} = 'active'
        AND (${apiTokenTable.startTimeUtc} IS NULL OR ${apiTokenTable.startTimeUtc} <= ${now})
        AND (${apiTokenTable.expireTimeUtc} IS NULL OR ${apiTokenTable.expireTimeUtc} > ${now})
        ${
          permission
            ? sql`AND EXISTS (SELECT 1 FROM json_each(${permissions}) AS token_permission
          WHERE token_permission.type = 'text' AND token_permission.value = ${permission})`
            : sql``
        })`;
  },

  async getUserMetadata(id: number) {
    const [user] = await db
      .select({
        id: userTable.id,
        username: userTable.username,
        isEnabled: userTable.isEnabled,
      })
      .from(userTable)
      .where(eq(userTable.id, id))
      .limit(1);
    return user ?? null;
  },

  async getApiTokenMetadata(id: number) {
    const [token] = await db
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
  },
};
