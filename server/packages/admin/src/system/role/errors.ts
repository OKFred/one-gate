import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

export const RoleDeletionError = {
  NOT_ACTIVE: "errorHandler.role.notActive",
  HAS_REFERENCES: "errorHandler.role.hasReferences",
  DEPARTMENTS_UNAVAILABLE: "errorHandler.role.departmentsUnavailable",
  NAME_CONFLICT: "errorHandler.role.nameConflict",
  NOT_DELETED: "errorHandler.role.notDeleted",
  STALE_DELETION: "errorHandler.role.staleDeletion",
  EXPIRED: "errorHandler.role.restoreExpired",
  STATE_CONFLICT: "errorHandler.role.stateConflict",
  CLOCK_CONFLICT: "errorHandler.role.clockConflict",
} as const;

export function rethrowRoleNameConflict(error: unknown): never {
  let cause: unknown = error;
  for (let depth = 0; depth < 5 && cause instanceof Error; depth += 1) {
    if (
      /UNIQUE constraint failed: system_role\.name|system_role_name_active_unique/iu.test(
        cause.message
      )
    ) {
      throw new BusinessError(RoleDeletionError.NAME_CONFLICT);
    }
    cause = cause.cause;
  }
  throw error;
}
