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
} from "./model";
import { asc, count, desc, eq, or, and, like } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
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
  preventMissingParent,
  preventSelfParent,
  preventCircularParent,
  preventDeleteWithChildren,
  preventDisableWithEnabledChildren,
} from "./prevention";
import { preventEmpty } from "@/middleware/auth/prevention";
import hasValue from "@/utils/hasValue";
import translationService from "@/api/i18n/translation/service";
import { utils as permissionUtils } from "@/api/system/permission/service";
import { utils as rolePermissionUtils } from "@/api/system/role_permission/service";
import { rolePermissionTable } from "@/api/system/role_permission/model";
import { permissionTable } from "@/api/system/permission/model";

// 构建查询条件(列表和全部通用)
export const buildWhereCondition = (condition?: {
  id?: number;
  keyword?: string;
  business?: string | null;
  isEnabled?: boolean;
}) => {
  const { id, keyword, business, isEnabled } = condition || {};
  const conditions = [];

  if (hasValue(id)) {
    conditions.push(eq(menuTable.id, id!));
  }
  if (hasValue(keyword)) {
    conditions.push(or(like(menuTable.name, `%${keyword}%`)));
  }
  if (hasValue(business)) {
    conditions.push(eq(menuTable.business, business!));
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
    business: MenuVO["business"],
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
  const whereCondition = buildWhereCondition(params);
  const rows = await db
    .select({
      id: menuTable.id,
      name: menuTable.name,
      icon: menuTable.icon,
      path: menuTable.path,
      parentId: menuTable.parentId,
      sort: menuTable.sort,
      business: menuTable.business,
      remark: menuTable.remark,
      isEnabled: menuTable.isEnabled,
    })
    .from(menuTable)
    .where(whereCondition)
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
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    business: MenuVO["business"],
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

  const whereCondition = buildWhereCondition(params);
  // 查询总数
  const countResult = await db
    .select({ total: count(menuTable.id).as("total") })
    .from(menuTable)
    .where(whereCondition);
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
    .where(whereCondition)
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
  permission: { action: "read" },
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

  // 前置校验
  await preventMissingParent(parentId);

  const updateData = {
    ...params,
    creatorId,
  };
  const res = await db
    .insert(menuTable)
    .values(updateData)
    .returning({ id: menuTable.id });
  const row = res[0];
  preventEmpty(row);
  return row.id;
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
  permission: { action: "add" },
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

  // 获取当前菜单记录，用于前置校验
  const current = await db
    .select()
    .from(menuTable)
    .where(eq(menuTable.id, id))
    .limit(1);
  const currentMenu = current[0];

  // 前置校验
  preventEmpty(currentMenu);
  preventSelfParent(id, rest.parentId);
  await preventMissingParent(rest.parentId);
  await preventCircularParent(id, rest.parentId);
  if (currentMenu.isEnabled !== undefined) {
    await preventDisableWithEnabledChildren(
      id,
      currentMenu.isEnabled,
      rest.isEnabled
    );
  }

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  // 构造 batch 任务
  const batchQueries: any[] = [
    db
      .update(menuTable)
      .set(updateData)
      .where(eq(menuTable.id, id))
      .returning({ id: menuTable.id }),
  ];

  // 使用 batch 确保菜单表和权限表的更新一致性（在 D1 中 batch 具有原子性）
  const batchResults = await db.batch(batchQueries as any);
  const updateResList = batchResults[0] as { id: number }[];
  const result = updateResList[0];
  preventEmpty(result);
  return result?.id;
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
  permission: { action: "edit" },
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

  // 前置校验
  await preventDeleteWithChildren(id);

  const res = await db
    .delete(menuTable)
    .where(eq(menuTable.id, id))
    .returning({ id: menuTable.id });
  const result = res[0];
  preventEmpty(result);
  return result?.id;
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
  permission: { action: "delete" },
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

  const result = rows[0];
  preventEmpty(result);
  return result;
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
  permission: { action: "read" },
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
  const { roleArr, isSuperAdmin } = userObj;
  const roleIds = roleArr.map((r) => r.value);
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
  // 如果不是超管角色，则根据用户角色权限过滤菜单
  if (!isSuperAdmin) {
    const userPermissions =
      await rolePermissionUtils.getPermissionsByRoleIds(roleIds);
    const permissionCodes = new Set(userPermissions.map((p) => p.code));

    // 1. 找出所有“直接可见”的菜单节点
    const visibleMenuIds = new Set<number>();
    allMenus.forEach((menu) => {
      const hasChildren = allMenus.some((m) => m.parentId === menu.id);
      let isVisible = false;

      if (menu.business) {
        // 有业务标识：检查是否有对应 :read 权限
        isVisible = permissionCodes.has(`${menu.business}:read`);
      } else {
        // 无业务标识：
        // 如果是叶子节点，默认可见（如首页、外部链接等）
        // 如果是父节点，其可见性由子节点决定，此处先不标记
        isVisible = !hasChildren;
      }

      if (isVisible) {
        visibleMenuIds.add(menu.id);
      }
    });

    // 2. 向上递归：确保所有可见节点的祖先也都被标记为可见
    const addAncestors = (menuId: number) => {
      const menu = allMenus.find((m) => m.id === menuId);
      if (menu?.parentId) {
        if (!visibleMenuIds.has(menu.parentId)) {
          visibleMenuIds.add(menu.parentId);
          addAncestors(menu.parentId);
        }
      }
    };

    // 对当前已确定的可见节点执行祖先搜寻
    const currentIds = Array.from(visibleMenuIds);
    currentIds.forEach((id) => addAncestors(id));

    // 3. 最终过滤
    filteredMenus = allMenus.filter((menu) => visibleMenuIds.has(menu.id));

    // 4. 清理：如果某个父节点（有业务标识）被标记为可见，但它实际上没有任何可见的子节点，且其自身链接为空
    // 这种情况通常发生在用户有父级权限但没子级权限时，为了避免空的目录，可以根据需求选择是否清理
    let changed = true;
    while (changed) {
      const beforeCount = filteredMenus.length;
      filteredMenus = filteredMenus.filter((menu) => {
        const hasVisibleChildren = filteredMenus.some(
          (m) => m.parentId === menu.id
        );
        // 如果有子节点，保留
        if (hasVisibleChildren) return true;
        // 如果没有子节点且有业务标识，保留（说明它本身就是个功能页）
        if (menu.business) return true;
        // 如果既没有子节点也没有业务标识，说明是个空目录，移除
        return false;
      });
      changed = filteredMenus.length !== beforeCount;
    }
  }

  // 3. 级联过滤：父菜单若因其他原因（如被禁用）不在列表中，则子菜单也不显示
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
  permission: false, // 所有登录用户均可调用，菜单可见性由 onTree 内部根据权限过滤
} satisfies API;

/** 获取菜单的直接子菜单列表 */
async function getChildMenus(menuId: number) {
  return await db
    .select({ id: menuTable.id })
    .from(menuTable)
    .where(eq(menuTable.parentId, menuId));
}

/** @description 获取所有菜单列表 */
async function getAllMenus(
  isEnabled?: boolean
): Promise<{ name: string; id: number; parentId: number | null }[]> {
  const allMenus = await db
    .select({
      name: menuTable.name,
      id: menuTable.id,
      parentId: menuTable.parentId,
    })
    .from(menuTable)
    .where(
      isEnabled !== undefined ? eq(menuTable.isEnabled, isEnabled) : undefined
    );
  return allMenus;
}

/** @description 获取子孙菜单的列表 */
async function getDescendantMenus(
  menuId: number
): Promise<{ name: string; id: number; parentId: number | null }[] | null> {
  if (!menuId) return null;
  const allMenus = await getAllMenus();
  const thisMenu = allMenus.find((m) => m.id === menuId);
  if (!thisMenu) return null;
  // 递归查找子孙菜单
  function findSubMenus(id: number): typeof allMenus {
    const result = [];
    for (const m of allMenus) {
      if (m.parentId === id) {
        result.push(m);
        result.push(...findSubMenus(m.id));
      }
    }
    return result;
  }
  return findSubMenus(menuId);
}

/** 获取菜单的直接启用子菜单数量 */
async function countEnabledChildMenus(menuId: number): Promise<number> {
  const result = await db
    .select({ total: count(menuTable.id).as("total") })
    .from(menuTable)
    .where(and(eq(menuTable.parentId, menuId), eq(menuTable.isEnabled, true)));
  return result[0]?.total ?? 0;
}

export const utils = {
  getChildMenus,
  countEnabledChildMenus,
  getAllMenus,
  getDescendantMenus,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  tree: treeApi,
};
