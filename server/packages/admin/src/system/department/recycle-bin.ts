import type {
  RecycleBinRecordId,
  RecycleBinResourceAdapter,
} from "@hodor/core/db/recycle-bin";
import type { SoftDeleteCleanupInput } from "@hodor/core/db/soft-delete";
import { can } from "@hodor/core/middleware/auth/permission";
import { invalidateAuthCache } from "@hodor/core/middleware/auth/cache-invalidation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { purgeExpiredDepartments as purgeExpired } from "./repository";
import {
  listDeletedDepartments,
  restoreDeletedDepartment,
  purgeDeletedDepartment,
  undoDeletedDepartment,
} from "./service";

function requireDepartmentId(id: RecycleBinRecordId): number {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  }
  return id;
}

export async function purgeExpiredDepartments(input: SoftDeleteCleanupInput) {
  const result = await purgeExpired(input);
  if (result.deletedCount > 0) await invalidateAuthCache();
  return result;
}

export const departmentRecycleBinAdapter: RecycleBinResourceAdapter = {
  resourceType: "department",
  labelKey: "businessType.admin.system.department",
  can: (action, user) =>
    can(
      user,
      action === "read" ? "read" : action === "restore" ? "edit" : "delete",
      "admin.system.department"
    ),
  list: (query) => listDeletedDepartments(query),
  restore: (input, user) =>
    restoreDeletedDepartment(
      requireDepartmentId(input.id),
      input.expectedDeletedTimeUtc,
      user.userId
    ),
  purge: (input, user) =>
    purgeDeletedDepartment(
      requireDepartmentId(input.id),
      input.expectedDeletedTimeUtc,
      user.userId
    ),
  purgeExpired: purgeExpiredDepartments,
  undo: (input, user) =>
    undoDeletedDepartment(
      requireDepartmentId(input.id),
      input.expectedDeletedTimeUtc,
      user
    ),
};
