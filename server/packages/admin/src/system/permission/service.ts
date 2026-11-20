import type { FromSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminSystemPermissionBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { permissionRepository } from "./repository";

const S = adminSystemPermissionBackendSchemas;

async function onListAll(
  params: FromSchema<typeof S.listAllReq>
): Promise<FromSchema<typeof S.listAllRes>> {
  const rows = await permissionRepository.findAll(params);
  return rows.map((row) => ({
    ...row,
    category: row.category as "action",
  }));
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await permissionRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    code: params.code,
    name: params.name,
    category: params.category,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(
    list.map((row) => ({
      ...row,
      category: row.category as "action",
    })),
    total,
    pageNo,
    finalPageSize
  );
}

export type PermissionAddLike = FromSchema<typeof S.addReq>;
async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: creatorId } = userObj;

  const insertedId = await permissionRepository.onInsert({
    ...obj,
    creatorId,
  });

  return insertedId;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const updateData = {
    ...rest,
    updaterId,
  };

  const updatedId = await permissionRepository.onUpdate(id, updateData);
  return updatedId;
}

async function onDelete(
  obj: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number> {
  const { id } = obj;
  const deletedId = await permissionRepository.onDelete(id);
  return deletedId;
}

export type PermissionInfo = FromSchema<typeof S.getRes>;
async function onGet(
  obj: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = obj;
  const row = await permissionRepository.findById(id);
  preventEmpty(row);
  return {
    ...row,
    category: row.category as "action",
  };
}

/**
 * 过滤生效的权限（处理 allow/deny）
 * @param permissions 权限数组
 * @returns 处理后的权限数组（只包含最终允许的权限）
 */
function filterEffectivePermissions(
  permissions: PermissionInfo[]
): PermissionInfo[] {
  // 按权限代码分组
  const permissionMap = new Map<string, PermissionInfo[]>();

  for (const perm of permissions) {
    const existing = permissionMap.get(perm.code) || [];
    existing.push(perm);
    permissionMap.set(perm.code, existing);
  }

  // 处理每个权限组
  const result: PermissionInfo[] = [];
  for (const [_, perms] of permissionMap) {
    result.push(perms[0]);
  }

  return result;
}

export const utils = {
  filterEffectivePermissions,
};

export default createCrudApis(S, {
  listAll: { summary: "获取所有权限（不分页）", handler: onListAll },
  list: { summary: "获取权限列表", handler: onList },
  add: { summary: "添加权限", handler: onAdd },
  update: { summary: "更新权限", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除权限",
    handler: onDelete,
  },
  get: { summary: "获取权限", handler: onGet },
});
