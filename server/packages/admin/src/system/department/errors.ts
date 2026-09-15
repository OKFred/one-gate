import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

export const DepartmentDeletionError = {
  NOT_ACTIVE: "errorHandler.department.notActive",
  HAS_REFERENCES: "errorHandler.department.hasReferences",
  INVALID_PARENT: "errorHandler.department.invalidParent",
  INVALID_DEPARTMENT_IDS: "errorHandler.department.invalidDepartmentIds",
  REFERENCE_UNAVAILABLE: "errorHandler.department.referenceUnavailable",
  NAME_CONFLICT: "errorHandler.department.nameConflict",
  NOT_DELETED: "errorHandler.department.notDeleted",
  STALE_DELETION: "errorHandler.department.staleDeletion",
  EXPIRED: "errorHandler.department.restoreExpired",
  STATE_CONFLICT: "errorHandler.department.stateConflict",
  CLOCK_CONFLICT: "errorHandler.department.clockConflict",
} as const;

export function rethrowDepartmentNameConflict(error: unknown): never {
  let cause: unknown = error;
  for (let depth = 0; depth < 5 && cause instanceof Error; depth += 1) {
    if (
      /UNIQUE constraint failed: system_department\.name|system_department_name_active_unique/iu.test(
        cause.message
      )
    ) {
      throw new BusinessError(DepartmentDeletionError.NAME_CONFLICT);
    }
    cause = cause.cause;
  }
  throw error;
}
