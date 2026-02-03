import db from "@/db/index";
import {
  menuTable,
  IndexVO,
  MenuVO,
  MenuListVO,
  MenuAddVO,
  MenuUpdateVO,
  MenuListKeys,
  MenuDetailKeys,
  MenuGetKeys,
  MenuDeleteKeys,
  MenuAddKeys,
  MenuUpdateKeys,
  MenuSortableKeys,
  type MenuPOLike,
  type MenuVOLike,
  type MenuAddVOLike,
  type MenuUpdateVOLike,
  type MenuDeleteVOLike,
  type MenuGetVOLike,
  MenuBaseVO,
} from "./db.table";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
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
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import permissionService, {
  utils as permissionUtils,
} from "@/api/system/permission/service";
import rolePermissionService, {
  utils as rolePermissionUtils,
} from "@/api/system/role_permission/service";
import { rolePermissionTable } from "@/api/system/role_permission/db.table";
import { permissionTable } from "@/api/system/permission/db.table";
import { SUPER_ADMIN_ROLE_ID } from "@/db/init";

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
}: Pick<FromSchema<typeof listReq>, "keyword" | "isEnabled">) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(menuTable.name, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(menuTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: MenuVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MenuPOLike)[]>(MenuSortableKeys),
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
      ...MenuBaseVO,
    },
    required: [...MenuGetKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = menuTable[orderBy] || menuTable.id;
  const maxLimit = 10000; // 设置最大返回数量限制，防止数据过大
  // 查询所有匹配的数据
  const rows = await db
    .select({
      id: menuTable.id,
      name: menuTable.name,
      icon: menuTable.icon,
      path: menuTable.path,
      remark: menuTable.remark,
      parentId: menuTable.parentId,
      sort: menuTable.sort,
      isEnabled: menuTable.isEnabled,
    })
    .from(menuTable)
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
    summary: "获取所有菜单（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MenuVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MenuPOLike)[]>(MenuSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MenuPOLike>[]>(
    {
      ...MenuListVO,
    },
    [...MenuListKeys]
  ),
} as const satisfies JSONSchema;
async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = menuTable[orderBy] || menuTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 查询总数
  const countResult = await db
    .select({ total: count(menuTable.id).as("total") })
    .from(menuTable)
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
  // 查询列表数据
  const rows = await db
    .select()
    .from(menuTable)
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
    summary: "获取菜单列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MenuAddVO,
  } satisfies Partial<Record<keyof MenuAddVOLike, JSONSchema>>,
  required: [...MenuAddKeys] as const satisfies RequiredKeys<MenuAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const { parentId, name } = params;

  // 如果有父菜单，检查父菜单是否存在
  if (hasValue(parentId)) {
    const parent = await db
      .select()
      .from(menuTable)
      .where(eq(menuTable.id, parentId))
      .limit(1);

    if (parent.length === 0) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }
  }
  const updateData = {
    ...params,
    creatorId,
  };
  const res = await db
    .insert(menuTable)
    .values(updateData)
    .returning({ id: menuTable.id });
  const menuId = res[0]?.id;
  if (menuId) {
    // 创建菜单权限记录
    await permissionUtils.createMenuPermission(menuId, name, userObj);
  }
  return menuId;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加菜单",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MenuUpdateVO,
  },
  required: [
    ...MenuUpdateKeys,
  ] as const satisfies RequiredKeys<MenuUpdateVOLike>[],
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
  // 如果更新父菜单，检查是否会造成循环引用
  if (rest.parentId) {
    // 不能将自己设为父菜单
    if (rest.parentId === id) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }

    // 检查父菜单是否存在
    const parent = await db
      .select()
      .from(menuTable)
      .where(eq(menuTable.id, rest.parentId))
      .limit(1);

    if (parent.length === 0) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }
  }

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  // 使用事务确保菜单表和权限表的更新一致性
  const result = await db.transaction(async (tx) => {
    const res = await tx
      .update(menuTable)
      .set(updateData)
      .where(eq(menuTable.id, id))
      .returning({ id: menuTable.id });

    if (!res || res.length === 0) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }

    // 如果更新了菜单名称，需要更新权限记录的名称
    const { name } = rest;
    if (name !== undefined) {
      // 处理权限更新
      const permissionId = await permissionUtils.getPermissionIdByMenuId(id);
      if (permissionId) {
        // 删除现有的角色权限关联
        await tx
          .delete(rolePermissionTable)
          .where(eq(rolePermissionTable.permissionId, permissionId));
        await tx
          .update(permissionTable)
          .set({
            code: `menu:${name}`,
            name,
            updaterId,
            updateTimeUtc: getCurrentTimestampUtcSql(),
          })
          .where(eq(permissionTable.id, permissionId));
      }
    }

    return res[0].id;
  });

  return result;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新菜单",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...MenuDeleteKeys,
  ] as const satisfies RequiredKeys<MenuDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  if (id === undefined) return null;

  // 检查是否有子菜单
  const children = await db
    .select()
    .from(menuTable)
    .where(eq(menuTable.parentId, id))
    .limit(1);

  if (children.length > 0) {
    throw new BusinessError(BusinessErrorCode.HAS_CHILDREN);
  }

  const res = await db
    .delete(menuTable)
    .where(eq(menuTable.id, id))
    .returning({ id: menuTable.id });
  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return res[0].id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除菜单",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [...MenuGetKeys] as const satisfies RequiredKeys<MenuGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MenuVO,
  },
  required: [...MenuDetailKeys] as const satisfies RequiredKeys<MenuVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(menuTable)
    .where(eq(menuTable.id, id))
    .limit(1);

  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return rows[0];
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取菜单信息",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

const treeReq = {
  type: "object",
  properties: {
    showAll: {
      description: "是否显示所有菜单（包括未启用的）",
      type: "boolean",
    },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const menuTreeItem = {
  type: "object",
  properties: {
    ...MenuVO,
    children: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...MenuVO,
          children: {
            type: "array",
            maxLength: 0,
            minLength: 0,
          },
        },
        required: [...MenuDetailKeys, "children"],
        additionalProperties: false,
      },
    },
  },
  required: [...MenuDetailKeys, "children"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const treeRes = {
  type: "array",
  items: {
    ...menuTreeItem,
  },
} as const satisfies JSONSchema;
async function onTree(
  params: FromSchema<typeof treeReq>,
  userObj: UserObj
): Promise<FromSchema<typeof treeRes> | null> {
  const { roleArr } = userObj;
  const roleIds = roleArr.map((r) => r.value);

  // 检查是否为超管角色
  const isSuperAdminRole = roleIds.includes(SUPER_ADMIN_ROLE_ID);

  // 获取所有菜单
  const { showAll } = params;
  // 构建查询条件
  const buildWhereCondition = () => {
    const conditions = [];
    if (showAll !== true) {
      conditions.push(eq(menuTable.isEnabled, true)); // 默认只查询启用的菜单
    }
    return conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : or(...conditions)
      : undefined;
  };
  const allMenus = await db
    .select()
    .from(menuTable)
    .where(buildWhereCondition())
    .orderBy(asc(menuTable.sort));

  let filteredMenus = allMenus;

  // 如果不是超管角色，则根据用户角色过滤菜单
  if (!isSuperAdminRole) {
    // 获取用户角色有权限的菜单ID列表
    const accessibleMenuIds =
      await rolePermissionUtils.getMenuIdsByRoleIds(roleIds);

    // 根据用户角色过滤菜单
    filteredMenus = allMenus.filter((menu) => {
      // 如果没有配置权限的菜单，默认所有用户可见
      if (!accessibleMenuIds.includes(menu.id)) return false;
      return true;
    });
  }

  // 父菜单没有权限时，所有子菜单也不显示
  filteredMenus = filteredMenus.filter((menu) => {
    if (!menu.parentId) return true;
    const parentMenu = filteredMenus.find((m) => m.id === menu.parentId);
    return !!parentMenu;
  });
  function buildMenuTree(
    data,
    parentId: number | null = null
  ): FromSchema<typeof treeRes> {
    return data
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: buildMenuTree(data, item.id),
      }));
  }
  const menuTree = buildMenuTree(filteredMenus);
  return menuTree;
}
const treeApi = {
  req: treeReq,
  res: treeRes,
  pathInfo: {
    path: "/tree",
    method: "post",
    summary: "获取树形菜单",
  } as const,
  adapter: bodyUserAdapter,
  service: onTree,
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  tree: treeApi,
};
