import { sql, type SQL } from "drizzle-orm";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";

/** Validate requested roles in the final INSERT/UPDATE, including disabled roles. */
export function activeRoleIds(ids: number[]): SQL {
  if (!ids.every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  }
  return sql`NOT EXISTS (SELECT 1 FROM json_each(${JSON.stringify(ids)}) AS requested_role
    WHERE NOT EXISTS (SELECT 1 FROM system_role AS referenced_role
      WHERE referenced_role.id = requested_role.value AND referenced_role.is_deleted = 0))`;
}

/** Malformed legacy JSON cannot be treated as an empty reference list. */
export function roleHasNoUserReferences(target: SQL): SQL {
  return sql`NOT EXISTS (SELECT 1 FROM system_user AS role_user WHERE
    CASE WHEN json_valid(role_user.role_id_arr) THEN json_type(role_user.role_id_arr) != 'array' ELSE 1 END
    OR EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(role_user.role_id_arr) AND
      CASE WHEN json_valid(role_user.role_id_arr) THEN json_type(role_user.role_id_arr) = 'array' ELSE 0 END
      THEN role_user.role_id_arr ELSE '[]' END) AS assigned_role
      WHERE assigned_role.type != 'integer' OR assigned_role.value <= 0
        OR assigned_role.value > ${Number.MAX_SAFE_INTEGER} OR assigned_role.value = ${target}))`;
}

/** Saved custom ranges are checked without parsing or repairing them in JavaScript. */
export function activeSavedRoleDepartments(ids: SQL): SQL {
  return sql`(${ids} IS NULL OR (json_valid(${ids}) AND
    CASE WHEN json_valid(${ids}) THEN json_type(${ids}) = 'array' ELSE 0 END
    AND NOT EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(${ids}) AND
      CASE WHEN json_valid(${ids}) THEN json_type(${ids}) = 'array' ELSE 0 END
      THEN ${ids} ELSE '[]' END) AS saved_department
      WHERE saved_department.type != 'integer' OR saved_department.value <= 0 OR saved_department.value > ${Number.MAX_SAFE_INTEGER}
        OR NOT EXISTS (SELECT 1 FROM system_department AS referenced_department
          WHERE referenced_department.id = saved_department.value AND referenced_department.is_deleted = 0))))`;
}
