import db from "@hodor/core/db/index";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { eq, sql, type SQL } from "drizzle-orm";
import { userTable } from "./user/model";
import { apiTokenTable } from "./api-token/model";
import { roleTable } from "./role/model";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
import { postgresSystemAccess } from "./access-metadata.pg";

/** Public structural guards keep cross-package writes atomic without exposing private repositories. */
export const systemAccess = {
  currentUserPermissionSql(id: number | SQL, permissionCode: string): SQL {
    if (isPostgresBackend())
      return postgresSystemAccess.currentUserPermissionSql(id, permissionCode);
    const roles = sql`CASE WHEN json_valid(acting_user.role_id_arr)
      THEN CASE WHEN json_type(acting_user.role_id_arr) = 'array'
        THEN acting_user.role_id_arr ELSE '[]' END ELSE '[]' END`;
    return sql`EXISTS (SELECT 1 FROM system_user AS acting_user
      WHERE acting_user.id = ${id} AND acting_user.is_enabled = 1
        AND NOT EXISTS (SELECT 1 FROM json_each(${roles}) AS invalid_role
          WHERE invalid_role.type != 'integer' OR invalid_role.value <= 0
            OR invalid_role.value > 9007199254740991)
        AND EXISTS (SELECT 1 FROM json_each(${roles}) AS assigned_role
          JOIN system_role AS acting_role ON acting_role.id = assigned_role.value
          WHERE assigned_role.type = 'integer' AND assigned_role.value > 0
            AND acting_role.is_enabled = 1 AND acting_role.is_deleted = 0
            AND (acting_role.id = 1 OR EXISTS (
              SELECT 1 FROM system_role_permission AS binding
              JOIN system_permission AS permission ON permission.id = binding.permission_id
              WHERE binding.role_id = acting_role.id AND permission.is_enabled = 1
                AND permission.code = ${permissionCode}))))`;
  },

  platformAdminSql(id: number | SQL): SQL {
    if (isPostgresBackend()) return postgresSystemAccess.platformAdminSql(id);
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
    if (isPostgresBackend()) return postgresSystemAccess.userActiveSql(id);
    return sql`EXISTS (SELECT 1 FROM ${userTable}
      WHERE ${userTable.id} = ${id} AND ${userTable.isEnabled} = 1)`;
  },

  tokenOwnedBySql(tokenId: number | SQL, userId: number | SQL): SQL {
    if (isPostgresBackend())
      return postgresSystemAccess.tokenOwnedBySql(tokenId, userId);
    return sql`EXISTS (SELECT 1 FROM ${apiTokenTable}
      WHERE ${apiTokenTable.id} = ${tokenId} AND ${apiTokenTable.creatorId} = ${userId})`;
  },

  tokenUsableSql(id: number | SQL, permission?: string): SQL {
    if (isPostgresBackend())
      return postgresSystemAccess.tokenUsableSql(id, permission);
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
    if (isPostgresBackend()) return postgresSystemAccess.getUserMetadata(id);
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
    if (isPostgresBackend())
      return postgresSystemAccess.getApiTokenMetadata(id);
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
