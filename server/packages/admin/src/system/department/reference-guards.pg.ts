import { sql, type SQL } from "drizzle-orm";
import {
  postgresJsonTextArray,
  postgresJsonArrayIsPositiveIds,
} from "@hodor/core/db/postgresql/sql";

export function postgresActiveDepartmentReference(id: number | null): SQL {
  return sql`(${id}::bigint IS NULL OR EXISTS (SELECT 1 FROM system_department AS referenced_department
    WHERE referenced_department.id = ${id} AND NOT referenced_department.is_deleted))`;
}

export function postgresActiveDepartmentIds(ids: string | null): SQL {
  return sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(${ids ?? "[]"}::jsonb) AS requested_department(value)
    WHERE NOT EXISTS (SELECT 1 FROM system_department AS referenced_department
      WHERE referenced_department.id = requested_department.value::bigint AND NOT referenced_department.is_deleted))`;
}

export function postgresDepartmentHasNoReferences(
  target: SQL,
  includeDeleted: boolean
): SQL {
  const ids = sql`department_role.custom_dept_ids`;
  const array = postgresJsonTextArray(ids);
  const valid = sql`CASE WHEN pg_input_is_valid(${ids}, 'jsonb')
    THEN jsonb_typeof(${ids}::jsonb) = 'array' ELSE FALSE END`;
  return sql`NOT EXISTS (SELECT 1 FROM system_department AS child
      WHERE child.parent_id = ${target} AND ${includeDeleted ? sql`TRUE` : sql`NOT child.is_deleted`})
    AND NOT EXISTS (SELECT 1 FROM "system_user" AS department_user WHERE department_user.department_id = ${target})
    AND NOT EXISTS (SELECT 1 FROM system_role AS department_role
      WHERE ${includeDeleted ? sql`TRUE` : sql`NOT department_role.is_deleted`} AND ${ids} IS NOT NULL
        AND (NOT ${valid} OR NOT ${postgresJsonArrayIsPositiveIds(array)}
          OR ${array} @> jsonb_build_array(${target}::bigint)))`;
}
