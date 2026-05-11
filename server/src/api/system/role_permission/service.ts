import db from "@/db/index";
import {
  rolePermissionTable,
  IndexVO,
  RolePermissionVO,
  RolePermissionListVO,
  RolePermissionAddVO,
  RolePermissionUpdateVO,
  RolePermissionListKeys,
  RolePermissionDetailKeys,
  RolePermissionGetKeys,
  RolePermissionDeleteKeys,
  RolePermissionAddKeys,
  RolePermissionUpdateKeys,
  RolePermissionSortableKeys,
  type RolePermissionPOLike,
  type RolePermissionVOLike,
  type RolePermissionAddVOLike,
  type RolePermissionUpdateVOLike,
  type RolePermissionDeleteVOLike,
  type RolePermissionGetVOLike,
  RolePermissionBaseVO,
} from "./model";
import {
  ErrorCodes,
  preventMissingRecord,
  preventMissingRole,
} from "./prevention";
import { permissionTable } from "../permission/model";
import roleService, { utils as roleUtils } from "../role/service";
import permissionService from "../permission/service";
import { asc, count, desc, eq, and, inArray, is } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import { PermissionInfo } from "@/api/system/permission/service";
import { utils as permissionUtils } from "@/api/system/permission/service";
import { SUPER_ADMIN_ROLE_ID } from "@/db/init";
import { kv } from "@/middleware/cache";
import { preventEmpty } from "@/middleware/auth/prevention";

// 构建查询条件
const buildWhereCondition = ({
  roleId,
  permissionId,
}: Pick<FromSchema<typeof listReq>, "roleId" | "permissionId">) => {
  const conditions = [];
  if (hasValue(roleId))
    conditions.push(eq(rolePermissionTable.roleId, roleId as number));
  if (hasValue(permissionId))
    conditions.push(
      eq(rolePermissionTable.permissionId, permissionId as number)
    );

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

async function getCurrentPermissionCount(roleId: number): Promise<number> {
  const countResult = await db
    .select({ count: count(rolePermissionTable.id).as("count") })
    .from(rolePermissionTable)
    .where(eq(rolePermissionTable.roleId, roleId));
  return countResult[0]?.count || 0;
}

/** 更新全局权限版本号，强制所有用户缓存失效 */
async function invalidateAuthCache() {
  await kv
    .put("system.auth.global_version", Date.now().toString())
    .catch(() => {});
}

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    roleId: RolePermissionVO["roleId"],
    permissionId: RolePermissionVO["permissionId"],
    orderBy: orderByWrapper<(keyof RolePermissionPOLike)[]>(
      RolePermissionSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...RolePermissionListVO,
    },
    required: [...RolePermissionListKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = rolePermissionTable[orderBy] || rolePermissionTable.id;
  const maxLimit = 10000;

  const rows = await db
    .select()
    .from(rolePermissionTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有角色权限关联（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    roleId: RolePermissionVO["roleId"],
    permissionId: RolePermissionVO["permissionId"],
    orderBy: orderByWrapper<(keyof RolePermissionPOLike)[]>(
      RolePermissionSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<RolePermissionPOLike>[]>(
    {
      ...RolePermissionListVO,
    },
    [...RolePermissionListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = rolePermissionTable[orderBy] || rolePermissionTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(rolePermissionTable.id).as("total") })
    .from(rolePermissionTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;
  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }

  const rows = await db
    .select()
    .from(rolePermissionTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(finalPageSize)
    .offset(offset);
  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
  };
}
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取角色权限关联列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...RolePermissionAddVO,
  } satisfies Partial<Record<keyof RolePermissionAddVOLike, JSONSchema>>,
  required: [
    ...RolePermissionAddKeys,
  ] as const satisfies RequiredKeys<RolePermissionAddVOLike>[],
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
  const { roleId, permissionId } = obj;

  // 前置校验
  await preventMissingRole(roleId);

  const result = await db
    .insert(rolePermissionTable)
    .values({
      ...obj,
      creatorId,
    })
    .returning({ id: rolePermissionTable.id });

  // 更新角色权限数量
  const currentCount = await getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return result[0]?.id;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加角色权限关联",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 批量添加权限到角色
const batchAddReq = {
  type: "object",
  properties: {
    roleId: RolePermissionVO["roleId"],
    permissionIds: {
      type: "array",
      items: { type: "number" },
      description: "权限ID列表",
      minItems: 1,
    },
  },
  required: ["roleId", "permissionIds"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const batchAddRes = {
  type: "number",
  description: "成功添加的数量",
} as const satisfies JSONSchema;
async function onBatchAdd(
  obj: FromSchema<typeof batchAddReq>,
  userObj: UserObj
): Promise<FromSchema<typeof batchAddRes>> {
  const { userId: creatorId } = userObj;
  const { roleId, permissionIds } = obj;

  // 前置校验
  await preventMissingRole(roleId);

  // 批量插入，分片处理以避免 D1 变量限制 (通常为 100)
  // 每行 3 个变量，取 25 行为一组 (75 变量)
  const chunkSize = 25;
  const batches = [];
  for (let i = 0; i < permissionIds.length; i += chunkSize) {
    const chunk = permissionIds.slice(i, i + chunkSize);
    const values = chunk.map((permissionId) => ({
      roleId,
      permissionId,
      creatorId,
    }));
    batches.push(
      db
        .insert(rolePermissionTable)
        .values(values)
        .returning({ id: rolePermissionTable.id })
    );
  }

  const results = batches.length > 0 ? await db.batch(batches as any) : [];
  const totalAdded = results.reduce(
    (acc: number, curr: any) => acc + curr.length,
    0
  );

  // 更新角色权限数量
  const currentCount = await getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return totalAdded;
}
const batchAddApi = {
  req: batchAddReq,
  res: batchAddRes,
  pathInfo: {
    path: "/batchAdd",
    method: "post",
    summary: "批量添加角色权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onBatchAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...RolePermissionUpdateVO,
  },
  required: [
    ...RolePermissionUpdateKeys,
  ] as const satisfies RequiredKeys<RolePermissionUpdateVOLike>[],
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
  const { id, roleId, permissionId, ...rest } = params;

  // 前置校验
  await preventMissingRecord(id);
  if (hasValue(roleId)) await preventMissingRole(roleId as number);

  const updateData = {
    ...rest,
    roleId,
    permissionId,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(rolePermissionTable)
    .set(updateData)
    .where(eq(rolePermissionTable.id, id))
    .returning({ id: rolePermissionTable.id });
  const row = res[0];
  preventEmpty(row);
  // 触发全局缓存失效
  await invalidateAuthCache();
  return row.id;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新角色权限关联",
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
    ...RolePermissionDeleteKeys,
  ] as const satisfies RequiredKeys<RolePermissionDeleteVOLike>[],
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

  // 前置校验
  const record = await db
    .select({ roleId: rolePermissionTable.roleId })
    .from(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .limit(1);
  const row = record[0];
  preventEmpty(row);
  const roleId = row.roleId;

  const result = await db
    .delete(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .returning({ id: rolePermissionTable.id });
  const resRow = result[0];
  preventEmpty(resRow);

  // 更新角色权限数量
  const currentCount = await getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return resRow.id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除角色权限关联",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 批量删除角色的权限
const batchDeleteReq = {
  type: "object",
  properties: {
    roleId: RolePermissionVO["roleId"],
    permissionIds: {
      type: "array",
      items: { type: "number" },
      description: "权限ID列表",
      minItems: 1,
    },
  },
  required: ["roleId", "permissionIds"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const batchDeleteRes = {
  type: "number",
  description: "成功删除的数量",
} as const satisfies JSONSchema;
async function onBatchDelete(
  obj: FromSchema<typeof batchDeleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof batchDeleteRes>> {
  const { roleId, permissionIds } = obj;

  // 前置校验
  await preventMissingRole(roleId);

  // 分片删除以避免 D1 变量限制 (通常为 100)
  // inArray 会产生 N 个变量，取 50 为一组
  const chunkSize = 50;
  const batches = [];
  for (let i = 0; i < permissionIds.length; i += chunkSize) {
    const chunk = permissionIds.slice(i, i + chunkSize);
    batches.push(
      db
        .delete(rolePermissionTable)
        .where(
          and(
            eq(rolePermissionTable.roleId, roleId),
            inArray(rolePermissionTable.permissionId, chunk)
          )
        )
        .returning({ id: rolePermissionTable.id })
    );
  }

  const results = batches.length > 0 ? await db.batch(batches as any) : [];
  const totalDeleted = results.reduce(
    (acc: number, curr: any) => acc + curr.length,
    0
  );

  // 更新角色权限数量
  const currentCount = await getCurrentPermissionCount(roleId);
  await roleUtils.updatePermissionCount(roleId, currentCount);

  // 触发全局缓存失效
  await invalidateAuthCache();

  return totalDeleted;
}
const batchDeleteApi = {
  req: batchDeleteReq,
  res: batchDeleteRes,
  pathInfo: {
    path: "/batchDelete",
    method: "post",
    summary: "批量删除角色权限",
  } as const,
  adapter: bodyUserAdapter,
  service: onBatchDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...RolePermissionGetKeys,
  ] as const satisfies RequiredKeys<RolePermissionGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...RolePermissionVO,
  },
  required: [
    ...RolePermissionDetailKeys,
  ] as const satisfies RequiredKeys<RolePermissionVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const rows = await db
    .select()
    .from(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .limit(1);
  const row = rows[0];
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取角色权限关联",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 获取角色的所有权限
const getPermissionsByRoleReq = {
  type: "object",
  properties: {
    roleId: RolePermissionVO["roleId"],
  },
  required: ["roleId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getPermissionsByRoleRes = {
  type: "array",
  items: {
    ...permissionService.get.res,
  },
} as const satisfies JSONSchema;
async function onGetPermissionsByRole(
  obj: FromSchema<typeof getPermissionsByRoleReq>
): Promise<FromSchema<typeof getPermissionsByRoleRes>> {
  const { roleId } = obj;
  const rows = await db
    .select({
      id: permissionTable.id,
      code: permissionTable.code,
      name: permissionTable.name,
      category: permissionTable.category,
      resource: permissionTable.resource,
      business: permissionTable.business,
      remark: permissionTable.remark,
      isEnabled: permissionTable.isEnabled,
      creatorId: permissionTable.creatorId,
      updaterId: permissionTable.updaterId,
      createTimeUtc: permissionTable.createTimeUtc,
      updateTimeUtc: permissionTable.updateTimeUtc,
    })
    .from(rolePermissionTable)
    .innerJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id)
    )
    .where(
      and(
        eq(rolePermissionTable.roleId, roleId),
        eq(permissionTable.isEnabled, true)
      )
    );
  return rows as PermissionInfo[];
}
const getPermissionsByRoleApi = {
  req: getPermissionsByRoleReq,
  res: getPermissionsByRoleRes,
  pathInfo: {
    path: "/getPermissionsByRole",
    method: "post",
    summary: "获取角色的所有权限",
  } as const,
  adapter: bodyAdapter,
  service: onGetPermissionsByRole,
  permission: { action: "read" },
} satisfies API;

/**
 * 根据角色ID数组获取所有权限
 * @param roleIds 角色ID数组
 * @returns 权限信息数组
 */
export async function getPermissionsByRoleIds(roleIds: number[]) {
  if (roleIds.length === 0) {
    return [];
  }
  // 如果是超管，给到所有权限（无视启用状态）
  if (roleIds.includes(SUPER_ADMIN_ROLE_ID)) {
    const rows = (await db.select().from(permissionTable)) as PermissionInfo[];
    return permissionUtils.filterEffectivePermissions(rows);
  }
  // 仅允许已启用的角色
  const enabledRoles = await roleService.listAll.service({ isEnabled: true });
  const enabledRoleIds = new Set(enabledRoles.map((role) => role.id));
  const filteredRoleIds = roleIds.filter((id) => enabledRoleIds.has(id));
  if (filteredRoleIds.length === 0) {
    return [];
  }
  const rows = (await db
    .select({
      id: permissionTable.id,
      code: permissionTable.code,
      name: permissionTable.name,
      category: permissionTable.category,
      resource: permissionTable.resource,
      business: permissionTable.business,
      remark: permissionTable.remark,
      isEnabled: permissionTable.isEnabled,
      creatorId: permissionTable.creatorId,
      updaterId: permissionTable.updaterId,
      createTimeUtc: permissionTable.createTimeUtc,
      updateTimeUtc: permissionTable.updateTimeUtc,
    })
    .from(rolePermissionTable)
    .innerJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id)
    )
    .where(
      and(
        inArray(rolePermissionTable.roleId, filteredRoleIds),
        eq(permissionTable.isEnabled, true)
      )
    )) as PermissionInfo[];
  const permissions = permissionUtils.filterEffectivePermissions(rows);
  return permissions;
}

// 工具函数：为角色添加菜单权限
async function addMenuPermissionToRole(
  roleId: number,
  permissionId: number,
  creatorId: number
) {
  const rolePermissionData = {
    roleId,
    permissionId,
    creatorId,
  };
  await db.insert(rolePermissionTable).values(rolePermissionData);
}

async function verifyRecordExists(id: number) {
  const rows = await db
    .select({ id: rolePermissionTable.id })
    .from(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .limit(1);
  return rows.length > 0;
}

async function verifyRoleExists(roleId: number) {
  return await roleUtils.verifyRoleExists(roleId);
}

export const utils = {
  addMenuPermissionToRole,
  getPermissionsByRoleIds,
  verifyRecordExists,
  verifyRoleExists,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  batchAdd: batchAddApi,
  update: updateApi,
  delete: deleteApi,
  batchDelete: batchDeleteApi,
  get: getApi,
  getPermissionsByRole: getPermissionsByRoleApi,
};
