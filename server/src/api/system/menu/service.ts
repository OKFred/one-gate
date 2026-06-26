import {
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
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
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
import { utils as rolePermissionUtils } from "@/api/system/role_permission/service";
import { menuRepository } from "./repository";

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
  return await menuRepository.findAll(params);
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
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await menuRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    business: params.business,
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
  const { parentId } = params;

  // 前置校验
  await preventMissingParent(parentId);

  const insertedId = await menuRepository.onInsert({
    ...params,
    creatorId,
  });

  return insertedId;
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
  const currentMenu = await menuRepository.findById(id);
  preventEmpty(currentMenu);

  // 前置校验
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
  };

  const updatedId = await menuRepository.onUpdate(id, updateData);
  return updatedId;
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

  const deletedId = await menuRepository.onDelete(id);
  return deletedId;
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
  const row = await menuRepository.findById(id);
  preventEmpty(row);
  return row;
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
  const allMenus = await menuRepository.getTreeMenus(showAll);

  let filteredMenus = allMenus;
  // 如果不是超管角色，则根据用户角色权限过滤菜单
  if (!isSuperAdmin) {
    const userPermissions =
      await rolePermissionUtils.getPermissionsByRoleIds(roleIds);
    const permissionCodes = new Set(userPermissions.map((p) => p.code));

    // 1. 初步过滤：有业务标识的必须有对应 :read 权限。没有业务标识的先保留。
    filteredMenus = allMenus.filter((menu) => {
      if (menu.business) {
        return permissionCodes.has(`${menu.business}:read`);
      }
      return true;
    });

    // 2. 递归清理：没有业务标识且没有可见子菜单的“空壳”顶级菜单
    let changed = true;
    while (changed) {
      const beforeCount = filteredMenus.length;
      filteredMenus = filteredMenus.filter((menu) => {
        // 如果有业务标识，保留（第一步已经过滤过权限了）
        if (menu.business) return true;
        // 如果没有业务标识，检查是否有子菜单在当前过滤列表中
        const hasVisibleChildren = filteredMenus.some(
          (m) => m.parentId === menu.id
        );
        return hasVisibleChildren;
      });
      changed = filteredMenus.length !== beforeCount;
    }

    // 3. 级联清理：确保父节点不在列表中的子节点也被移除（严格层级可见性）
    changed = true;
    while (changed) {
      const beforeCount = filteredMenus.length;
      filteredMenus = filteredMenus.filter((menu) => {
        if (!menu.parentId) return true;
        return filteredMenus.some((m) => m.id === menu.parentId);
      });
      changed = filteredMenus.length !== beforeCount;
    }
  }

  // 4. 再次级联过滤：处理其他通用过滤情况（如被禁用等）
  filteredMenus = filteredMenus.filter((menu) => {
    if (!menu.parentId) return true;
    const parentMenu = filteredMenus.find((m) => m.id === menu.parentId);
    return !!parentMenu;
  });
  function buildMenuTree(
    data: MenuPOLike[],
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
  return await menuRepository.getChildMenus(menuId);
}

/** @description 获取所有菜单列表 */
async function getAllMenus(
  isEnabled?: boolean
): Promise<{ name: string; id: number; parentId: number | null }[]> {
  return await menuRepository.getAllMenus(isEnabled);
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
  return await menuRepository.countEnabledChildMenus(menuId);
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
