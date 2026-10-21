import {
  IndexVO,
  RoleVO,
  RoleListVO,
  RoleAddVO,
  RoleUpdateVO,
  RoleListKeys,
  RoleDetailKeys,
  RoleGetKeys,
  RoleDeleteKeys,
  RoleAddKeys,
  RoleUpdateKeys,
  RoleSortableKeys,
  type RolePOLike,
  type RoleVOLike,
  type RoleAddVOLike,
  type RoleUpdateVOLike,
  type RoleDeleteVOLike,
  type RoleGetVOLike,
  RoleBaseVO,
  RoleUniqueKeys,
  RoleUniqueVO,
  RoleDeleteWithUndoReq,
  RoleDeleteWithUndoRes,
} from "./model";
import { DataScope, DataScopeValues } from "@hodor/core/types/dataScope";
import { invalidateAuthCache } from "@hodor/core/middleware/auth/cache-invalidation";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  preventSuperAdminDelete,
  preventSuperAdminUpdate,
  preventMissingRoles,
} from "./prevention";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
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

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: RoleVO["isEnabled"],
    orderBy: orderByWrapper<(keyof RolePOLike)[]>(RoleSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...IndexVO,
      ...RoleBaseVO,
      ...RoleUniqueVO,
      updateTimeUtc: RoleVO.updateTimeUtc,
    },
    required: [...RoleGetKeys, ...RoleUniqueKeys, "updateTimeUtc"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await roleRepository.findAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有角色（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: RoleVO["isEnabled"],
    orderBy: orderByWrapper<(keyof RolePOLike)[]>(RoleSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<RolePOLike>[]>(
    {
      ...RoleListVO,
    },
    [...RoleListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
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

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取角色列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...RoleAddVO,
    dataScope: {
      type: "string",
      enum: DataScopeValues,
      description: "数据访问范围",
      default: DataScope.SELF_ONLY,
    },
    customDeptIds: {
      type: ["string", "null"],
      nullable: true,
      description: "自定义部门ID列表（JSON序列化）",
    },
  } satisfies Partial<Record<keyof RoleAddVOLike, JSONSchema>>,
  required: [...RoleAddKeys] as const satisfies RequiredKeys<RoleAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;

  const insertedId = await roleRepository.onInsert({
    permissionCount: 0,
    ...obj,
    creatorId,
    isDeleted: false,
    deletedTimeUtc: null,
    deleterId: null,
  });
  await invalidateAuthCache();
  return insertedId;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加角色",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...RoleUpdateVO,
    dataScope: {
      type: "string",
      enum: DataScopeValues,
      description: "数据访问范围",
    },
    customDeptIds: {
      type: ["string", "null"],
      nullable: true,
      description: "自定义部门ID列表（JSON序列化）",
    },
  },
  required: [
    ...RoleUpdateKeys,
  ] as const satisfies RequiredKeys<RoleUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
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
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新角色",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...RoleDeleteKeys,
  ] as const satisfies RequiredKeys<RoleDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  obj: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = obj;
  requireActor(userObj.userId);
  // 前置校验
  preventSuperAdminDelete(id);
  const deletedId = await roleRepository.onDelete(id, userObj.userId);
  await invalidateAuthCache();
  return deletedId;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除角色",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

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

const deleteWithUndoApi = {
  req: RoleDeleteWithUndoReq,
  res: RoleDeleteWithUndoRes,
  pathInfo: {
    path: "/deleteWithUndo",
    method: "post",
    summary: "删除角色并返回短时撤销收据",
  },
  adapter: bodyUserAdapter,
  service: onDeleteWithUndo,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [...RoleGetKeys] as const satisfies RequiredKeys<RoleGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...RoleVO,
  },
  required: [...RoleDetailKeys] as const satisfies RequiredKeys<RoleVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const row = await roleRepository.findById(id);
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取角色",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

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
  const purged = await roleRepository.purge(id, expectedDeletedTimeUtc);
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

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  deleteWithUndo: deleteWithUndoApi,
  get: getApi,
};
