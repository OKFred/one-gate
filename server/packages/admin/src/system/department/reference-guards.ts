import { sql, type SQL } from "drizzle-orm";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { DepartmentDeletionError } from "./errors";

/** Kept inside the mutating SQL so a concurrent deletion cannot win after validation. */
export function activeDepartmentReference(id: number | null): SQL {
  return sql`(${id} IS NULL OR EXISTS (SELECT 1 FROM system_department AS referenced_department WHERE referenced_department.id = ${id} AND referenced_department.is_deleted = 0))`;
}

export function normalizeDepartmentIds(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined || value === null) return value;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BusinessError(DepartmentDeletionError.INVALID_DEPARTMENT_IDS);
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (id: unknown) =>
        typeof id === "number" && Number.isSafeInteger(id) && id > 0
    )
  ) {
    throw new BusinessError(DepartmentDeletionError.INVALID_DEPARTMENT_IDS);
  }
  return JSON.stringify([...new Set(parsed as number[])]);
}

export function activeDepartmentIds(ids: string | null): SQL {
  return sql`NOT EXISTS (SELECT 1 FROM json_each(${ids ?? "[]"}) AS requested_department WHERE NOT EXISTS (SELECT 1 FROM system_department AS referenced_department WHERE referenced_department.id = requested_department.value AND referenced_department.is_deleted = 0))`;
}

/** Table names are fixed internal identifiers, never client-provided SQL. */
export function departmentHasNoReferences(
  target: SQL,
  includeDeletedChildren: boolean
): SQL {
  const childState = includeDeletedChildren
    ? sql`1 = 1`
    : sql`child.is_deleted = 0`;
  return sql`NOT EXISTS (SELECT 1 FROM system_department AS child WHERE child.parent_id = ${target} AND ${childState})
    AND NOT EXISTS (SELECT 1 FROM system_user AS department_user WHERE department_user.department_id = ${target})
    AND NOT EXISTS (SELECT 1 FROM system_role AS department_role, json_each(CASE WHEN json_valid(department_role.custom_dept_ids) THEN department_role.custom_dept_ids ELSE '[]' END) AS assigned_department WHERE CAST(assigned_department.value AS INTEGER) = ${target})`;
}
