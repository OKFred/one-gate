import {
  RoleDeleteWithUndoReq,
  RoleDeleteWithUndoRes,
  type RolePOLike,
} from "./model";
import { DataScope } from "@hodor/core/types/dataScope";
import { invalidateAuthCache } from "@hodor/core/middleware/auth/cache-invalidation";
import type { FromSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminSystemRoleBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import {
  preventSuperAdminDelete,
  preventSuperAdminUpdate,
  preventMissingRoles,
} from "./prevention";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { roleRepository } from "./repository";
import { can } from "@hodor/core/middleware/auth/permission";
import {
  SOFT_DELETE_RETENTION_MS,
  SOFT_DELETE_UNDO_WINDOW_MS,
} from "@hodor/core/db/soft-delete";
import {
  RecycleBinUndoError,
  type SoftDeleteUndoReceipt,
} from "@hodor/core/db/recycle-bin";
import { RoleDeletionError } from "./errors";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";

const S = adminSystemRoleBackendSchemas;

async function onListAll(
  params: FromSchema<typeof S.listAllReq>
): Promise<FromSchema<typeof S.listAllRes>> {
  return await roleRepository.findAll(params);
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await roleRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: creatorId } = userObj;

  const insertedId = await roleRepository.onInsert({
    permissionCount: 0,
    remark: obj.remark ?? null,
    dataScope: obj.dataScope ?? DataScope.SELF_ONLY,
    customDeptIds: obj.customDeptIds ?? null,
    name: obj.name,
    isEnabled: obj.isEnabled,
    creatorId,
    isDeleted: false,
    deletedTimeUtc: null,
    deleterId: null,
  });
  await invalidateAuthCache();
  return insertedId;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  // 前置校验
  preventSuperAdminUpdate(id, params);

  const updateData = {
    ...rest,
    updaterId,
  };

  const updatedId = await roleRepository.onUpdate(id, updateData);
  await invalidateAuthCache();
  return updatedId;
}

async function onDelete(
  obj: FromSchema<typeof S.deleteReq>,
  userObj: UserObj
): Promise<number> {
  const { id } = obj;
  requireActor(userObj.userId);
  // 前置校验
  preventSuperAdminDelete(id);
  const deletedId = await roleRepository.onDelete(id, userObj.userId);
  await invalidateAuthCache();
  return deletedId;
}

async function onDeleteWithUndo(
  params: FromSchema<typeof RoleDeleteWithUndoReq>,
  user: UserObj
): Promise<FromSchema<typeof RoleDeleteWithUndoRes>> {
  requireActor(user?.userId);
  if (!(await can(user, "delete", "admin.system.role")))
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  preventSuperAdminDelete(params.id);
  const deleted = await roleRepository.onDeleteWithUndo(
    params.id,
    params.expectedUpdateTimeUtc,
    user.userId
  );
  await invalidateAuthCache();
  return {
    resourceType: "role" as const,
    ...deleted,
    undoExpiresTimeUtc:
      deleted.expectedDeletedTimeUtc + SOFT_DELETE_UNDO_WINDOW_MS,
  } satisfies SoftDeleteUndoReceipt;
}

async function onGet(
  obj: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = obj;
  const row: RolePOLike | null = await roleRepository.findById(id);
  preventEmpty(row);
  return row;
}

async function getRolesByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  return await roleRepository.getRolesByIds(ids);
}

async function verifyRoles(roleIdArr: number[]) {
  await preventMissingRoles(roleIdArr);
}

/** 更新角色的权限数量 */
async function updatePermissionCount(
  roleId: number,
  newCount: number
): Promise<void> {
  await roleRepository.updatePermissionCount(roleId, newCount);
}

async function verifyRoleExists(roleId: number) {
  return await roleRepository.verifyRoleExists(roleId);
}

async function getRoleDataScopes(roleIds: number[]) {
  return await roleRepository.getRoleDataScopes(roleIds);
}

async function getAuthorizationRoles(roleIds: number[]) {
  return await roleRepository.getAuthorizationRoles(roleIds);
}

export const utils = {
  getRolesByIds,
  getRoleDataScopes,
  getAuthorizationRoles,
  verifyRoles,
  verifyRoleExists,
  updatePermissionCount,
};

function requireActor(actorId: number): void {
  if (!Number.isSafeInteger(actorId) || actorId <= 0)
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
}

export async function listDeletedRoles(params: {
  keyword?: string;
  pageNo: number;
  pageSize: number;
  now?: number;
}) {
  return roleRepository.listDeleted({
    ...params,
    pageNo: Math.max(1, params.pageNo),
    pageSize: Math.min(100, Math.max(1, params.pageSize)),
  });
}

async function requireDeletedState(id: number, expectedDeletedTimeUtc: number) {
  const row = await roleRepository.findUndoState(id);
  if (!row || !row.isDeleted || row.deletedTimeUtc === null)
    throw new BusinessError(RoleDeletionError.NOT_DELETED);
  if (row.deletedTimeUtc !== expectedDeletedTimeUtc)
    throw new BusinessError(RoleDeletionError.STALE_DELETION);
  return row;
}

export async function restoreDeletedRole(
  id: number,
  expectedDeletedTimeUtc: number,
  actorId: number
): Promise<number> {
  requireActor(actorId);
  async function checkCurrentState() {
    const row = await requireDeletedState(id, expectedDeletedTimeUtc);
    const age = row.serverTimeUtc - expectedDeletedTimeUtc;
    if (age < 0 || age >= SOFT_DELETE_RETENTION_MS)
      throw new BusinessError(RoleDeletionError.EXPIRED);
    if (!row.departmentsAvailable)
      throw new BusinessError(RoleDeletionError.DEPARTMENTS_UNAVAILABLE);
  }
  await checkCurrentState();
  const restored = await roleRepository.restore(
    id,
    expectedDeletedTimeUtc,
    actorId
  );
  if (restored === null) {
    await checkCurrentState();
    throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
  }
  await invalidateAuthCache();
  return restored;
}

export async function undoDeletedRole(
  id: number,
  expectedDeletedTimeUtc: number,
  user: UserObj
): Promise<number> {
  requireActor(user?.userId);
  if (!(await can(user, "delete", "admin.system.role")))
    throw new BusinessError(RecycleBinUndoError.FORBIDDEN);
  async function checkCurrentState() {
    const row = await requireDeletedState(id, expectedDeletedTimeUtc);
    if (row.deleterId !== user.userId)
      throw new BusinessError(RecycleBinUndoError.FORBIDDEN);
    const age = row.serverTimeUtc - expectedDeletedTimeUtc;
    if (age < 0 || age >= SOFT_DELETE_UNDO_WINDOW_MS)
      throw new BusinessError(RecycleBinUndoError.EXPIRED);
    if (!row.departmentsAvailable)
      throw new BusinessError(RoleDeletionError.DEPARTMENTS_UNAVAILABLE);
  }
  await checkCurrentState();
  const restored = await roleRepository.undoDelete(
    id,
    expectedDeletedTimeUtc,
    user.userId
  );
  if (restored === null) {
    await checkCurrentState();
    throw new BusinessError(RoleDeletionError.STATE_CONFLICT);
  }
  await invalidateAuthCache();
  return restored;
}

/** The adapter additionally requires the current identity to be a super administrator. */
export async function purgeDeletedRole(
  id: number,
  expectedDeletedTimeUtc: number,
  actorId: number
): Promise<number> {
  requireActor(actorId);
  preventSuperAdminDelete(id);
  await requireDeletedState(id, expectedDeletedTimeUtc);
  const purged = await roleRepository.purge(
    id,
    expectedDeletedTimeUtc,
    undefined,
    actorId
  );
  if (purged === null) {
    await requireDeletedState(id, expectedDeletedTimeUtc);
    throw new BusinessError(RoleDeletionError.HAS_REFERENCES);
  }
  await invalidateAuthCache();
  console.log(
    JSON.stringify({ event: "role.purged", id, actorId, time: Date.now() })
  );
  return purged;
}

export default createCrudApis(S, {
  listAll: { summary: "获取所有角色（不分页）", handler: onListAll },
  list: { summary: "获取角色列表", handler: onList },
  add: { summary: "添加角色", handler: onAdd },
  update: { summary: "更新角色", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除角色",
    handler: onDelete,
  },
  deleteWithUndo: {
    adapter: bodyUserAdapter,
    summary: "删除角色并返回短时撤销收据",
    handler: onDeleteWithUndo,
  },
  get: { summary: "获取角色", handler: onGet },
});
