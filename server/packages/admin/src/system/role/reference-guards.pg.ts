import { sql, type SQL } from "drizzle-orm";
import {
  postgresJsonTextArray,
  postgresJsonArrayIsPositiveIds,
} from "@hodor/core/db/postgresql/sql";

export function postgresActiveRoleIds(ids: number[]): SQL {
  return sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb) AS requested_role(value)
    WHERE NOT EXISTS (SELECT 1 FROM system_role AS referenced_role
      WHERE referenced_role.id = requested_role.value::bigint AND NOT referenced_role.is_deleted))`;
}

export function postgresRoleHasNoUserReferences(target: SQL): SQL {
  const ids = sql`role_user.role_id_arr`;
  return sql`NOT EXISTS (SELECT 1 FROM "system_user" AS role_user
    WHERE NOT ${postgresJsonArrayIsPositiveIds(ids)}
      OR ${ids} @> jsonb_build_array(${target}::bigint))`;
}

export function postgresActiveSavedRoleDepartments(ids: SQL): SQL {
  const array = postgresJsonTextArray(ids);
  return sql`(${ids} IS NULL OR (
    CASE WHEN pg_input_is_valid(${ids}, 'jsonb')
      THEN jsonb_typeof(${ids}::jsonb) = 'array' ELSE FALSE END
    AND ${postgresJsonArrayIsPositiveIds(array)}
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${array}) AS saved_department(value)
      WHERE NOT EXISTS (SELECT 1 FROM system_department AS referenced_department
        WHERE referenced_department.id::numeric = CASE WHEN jsonb_typeof(saved_department.value) = 'number'
          THEN (saved_department.value #>> '{}')::numeric ELSE NULL END
          AND NOT referenced_department.is_deleted))))`;
}
