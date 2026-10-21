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
import { purgeExpiredRoles as purgeExpired } from "./repository";
import {
  listDeletedRoles,
  restoreDeletedRole,
  purgeDeletedRole,
  undoDeletedRole,
} from "./service";

function requireRoleId(id: RecycleBinRecordId): number {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0)
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  return id;
}

export async function purgeExpiredRoles(input: SoftDeleteCleanupInput) {
  const result = await purgeExpired(input);
  if (result.deletedCount > 0) await invalidateAuthCache();
  return result;
}

export const roleRecycleBinAdapter: RecycleBinResourceAdapter = {
  resourceType: "role",
  labelKey: "businessType.admin.system.role",
  can: (action, user) =>
    can(
      user,
      action === "read" ? "read" : action === "restore" ? "edit" : "delete",
      "admin.system.role"
    ),
  list: (query) => listDeletedRoles(query),
  restore: (input, user) =>
    restoreDeletedRole(
      requireRoleId(input.id),
      input.expectedDeletedTimeUtc,
      user.userId
    ),
  purge: async (input, user) => {
    await user.ensureLoaded();
    if (!user.isSuperAdmin)
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    return purgeDeletedRole(
      requireRoleId(input.id),
      input.expectedDeletedTimeUtc,
      user.userId
    );
  },
  purgeExpired: purgeExpiredRoles,
  undo: (input, user) =>
    undoDeletedRole(
      requireRoleId(input.id),
      input.expectedDeletedTimeUtc,
      user
    ),
};
