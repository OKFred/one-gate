import {
  IndexVO,
  DepartmentVO,
  DepartmentListVO,
  DepartmentAddVO,
  DepartmentUpdateVO,
  DepartmentListKeys,
  DepartmentDetailKeys,
  DepartmentGetKeys,
  DepartmentDeleteKeys,
  DepartmentAddKeys,
  DepartmentUpdateKeys,
  DepartmentSortableKeys,
  type DepartmentPOLike,
  type DepartmentVOLike,
  type DepartmentAddVOLike,
  type DepartmentUpdateVOLike,
  type DepartmentDeleteVOLike,
  type DepartmentGetVOLike,
  DepartmentBaseVO,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import { exportDeletionRecord } from "@/api/maintenance/compliance";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import {
  preventMissingParent,
  preventSelfParent,
  preventCircularParent,
  preventDisable,
  preventHasEnabledUsers,
  preventHasChildren,
} from "./prevention";
import { preventEmpty } from "@/middleware/auth/prevention";
import { departmentRepository } from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: DepartmentVO["isEnabled"],
    orderBy: orderByWrapper<(keyof DepartmentPOLike)[]>(DepartmentSortableKeys),
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
      ...DepartmentBaseVO,
    },
    required: [...DepartmentGetKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listAllRes>> {
  return await departmentRepository.findAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有部门（不分页）",
  } as const,
  adapter: bodyUserAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: DepartmentVO["isEnabled"],
    parentId: { ...{ ...IndexVO.id, description: "父部门ID" } },
    orderBy: orderByWrapper<(keyof DepartmentPOLike)[]>(DepartmentSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<DepartmentPOLike>[]>(
    {
      ...DepartmentListVO,
    },
    [...DepartmentListKeys]
  ),
} as const satisfies JSONSchema;
async function onList(
  params: FromSchema<typeof listReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await departmentRepository.findPage({
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
    summary: "获取部门列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...DepartmentAddVO,
  } satisfies Partial<Record<keyof DepartmentAddVOLike, JSONSchema>>,
  required: [
    ...DepartmentAddKeys,
  ] as const satisfies RequiredKeys<DepartmentAddVOLike>[],
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
  const { name, remark, parentId, isEnabled } = params;

  // 前置校验
  await preventMissingParent(parentId);

  const insertedId = await departmentRepository.onInsert({
    name,
    remark,
    parentId,
    isEnabled,
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
    summary: "添加部门",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...DepartmentUpdateVO,
  },
  required: [
    ...DepartmentUpdateKeys,
  ] as const satisfies RequiredKeys<DepartmentUpdateVOLike>[],
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
  const row = await onGet({ id }, userObj);
  preventEmpty(row);

  if (params.parentId !== undefined && params.parentId !== row.parentId) {
    await preventMissingParent(params.parentId);
  }
  preventSelfParent(id, params.parentId);
  await preventCircularParent(id, params.parentId);
  await preventDisable(id, row.isEnabled, params.isEnabled);

  const updateData = {
    ...rest,
    updaterId,
  };

  const updatedId = await departmentRepository.onUpdate(id, updateData);
  return updatedId;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新部门",
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
    ...DepartmentDeleteKeys,
  ] as const satisfies RequiredKeys<DepartmentDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  if (!userObj?.userId) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }
  const { id } = params;
  if (id === undefined) return null;

  // 前置校验
  const row = await onGet({ id }, userObj);
  preventEmpty(row);

  await preventHasEnabledUsers(id);
  await preventHasChildren(id);

  // 执行删除操作
  const deletedId = await departmentRepository.onDelete(id);

  // 归档删除记录
  try {
    await exportDeletionRecord(
      {
        sourceTable: "department",
        sourcePrimaryKey: String(id),
        deleteReason: "system",
        deleteType: "purge",
        recordSnapshot: JSON.stringify(row),
        remark: `部门"${row.name}"被删除`,
        restorable: true,
        restoreUntilTimeUtc: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).getTime(), // 30天后不可恢复
        complianceNote: null,
      },
      userObj.userId
    );
  } catch (error) {
    console.error("归档删除记录失败:", error);
    // 归档失败不影响删除操作
  }

  return deletedId;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除部门",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...DepartmentGetKeys,
  ] as const satisfies RequiredKeys<DepartmentGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...DepartmentVO,
  },
  required: [
    ...DepartmentDetailKeys,
  ] as const satisfies RequiredKeys<DepartmentVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  params: FromSchema<typeof getReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const row = await departmentRepository.findById(id);
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取部门信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

const treeReq = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
// 定义递归类型用于树形结构
type DepartmentTreeItem = DepartmentVOLike & {
  children: DepartmentTreeItem[];
};
const departmentTreeItemSchema: JSONSchema = {
  type: "object",
  properties: {
    ...DepartmentVO,
    children: {
      type: "array",
      items: {
        properties: {
          ...DepartmentVO,
          children: { type: "array" },
        },
      }, // 递归引用自身
    },
  },
  required: [...DepartmentDetailKeys, "children"],
  additionalProperties: false,
};
const treeRes = {
  type: "array",
  items: departmentTreeItemSchema,
} as const satisfies JSONSchema;
async function onTree(
  params: FromSchema<typeof treeReq>,
  userObj: UserObj
): Promise<DepartmentTreeItem[]> {
  // 获取所有部门
  const allDepartments = await departmentRepository.getTreeData();

  // 递归构建树形结构
  function buildDepartmentTree(
    data: typeof allDepartments,
    parentId: number | null = null
  ): DepartmentTreeItem[] {
    return data
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: buildDepartmentTree(data, item.id),
      }));
  }

  const departmentTree = buildDepartmentTree(allDepartments);
  return departmentTree;
}

const treeApi = {
  req: treeReq,
  res: treeRes,
  pathInfo: {
    path: "/tree",
    method: "post",
    summary: "获取树形部门列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onTree,
  permission: { action: "read" },
} satisfies API;

/** @description 根据ID获取部门名称 */
export async function getDepartmentNameById(
  id: number
): Promise<string | null> {
  return await departmentRepository.getDepartmentNameById(id);
}

/** @description 获取所有部门列表 */
async function getAllDepartments(
  isEnabled?: boolean
): Promise<{ name: string; id: number; parentId: number }[]> {
  return await departmentRepository.getAllDepartments(isEnabled);
}

/** @description 获取子孙部门的列表 */
export async function getDescendantDepartments(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number }[] | null> {
  if (!departmentId) return null;
  const allDepartments = await getAllDepartments(true);
  const thisDepartment = allDepartments.find(
    (dept) => dept.id === departmentId
  );
  if (!thisDepartment) return null;
  // 递归查找子女部门
  function findSubDepartments(id: number): typeof allDepartments {
    const result = [];
    for (const dept of allDepartments) {
      if (dept.parentId === id) {
        result.push(dept);
        result.push(...findSubDepartments(dept.id));
      }
    }
    return result;
  }
  return findSubDepartments(departmentId);
}

/** @description 获取祖先部门的列表 */
export async function getAncestorDepartments(departmentId: number): Promise<
  | {
      name: string;
      id: number;
      parentId: number;
    }[]
  | null
> {
  if (!departmentId) return null;
  const allDepartments = await getAllDepartments(true);
  const thisDepartment = allDepartments.find(
    (dept) => dept.id === departmentId
  );
  if (!thisDepartment) return null;
  // 递归查找祖先部门
  const ancestors: { name: string; id: number; parentId: number }[] = [];
  function findAncestors(id: number) {
    const dept = allDepartments.find((d) => d.id === id);
    if (dept && dept.parentId) {
      const parentDept = allDepartments.find((d) => d.id === dept.parentId);
      if (parentDept) {
        ancestors.push(parentDept);
        findAncestors(parentDept.id);
      }
    }
  }
  findAncestors(departmentId);
  return ancestors;
}

/** @description 获取父母部门的列表 */
export async function getParentDepartment(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number } | null> {
  if (!departmentId) return null;
  const allDepartments = await getAllDepartments(true);
  const thisDepartment = allDepartments.find(
    (dept) => dept.id === departmentId
  );
  if (!thisDepartment) return null;
  const { parentId } = thisDepartment;
  if (!parentId) return null;
  const parentDept = allDepartments.find((dept) => dept.id === parentId);
  if (!parentDept) return null;
  return parentDept;
}

/** @description 获取子女部门的列表 */
export async function getChildDepartments(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number }[] | null> {
  if (!departmentId) return null;
  const allDepartments = await getAllDepartments(true);
  const children = allDepartments.filter(
    (dept) => dept.parentId === departmentId
  );
  return children.length > 0 ? children : null;
}

/** @description 获取父母部门及其所有子孙部门的列表 */
export async function getParentAndItsDescendants(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number }[] | null> {
  const parentDepartment = await getParentDepartment(departmentId);
  if (!parentDepartment) return null;
  const descendants = await getDescendantDepartments(parentDepartment.id);
  return [parentDepartment, ...(descendants || [])];
}

/** @description 获取同辈部门的列表 */
export async function getSiblingDepartments(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number }[] | null> {
  const parentDepartment = await getParentDepartment(departmentId);
  if (!parentDepartment) return null;
  const allDepartments = await getAllDepartments(true);
  const siblings = allDepartments.filter(
    (dept) => dept.parentId === parentDepartment.id && dept.id !== departmentId
  );
  return siblings;
}

/** @description 验证部门是否存在 */
export async function verifyDepartment(departmentId: number) {
  const row = await departmentRepository.findById(departmentId);
  preventEmpty(row);
}

export const utils = {
  verifyDepartment,
  getDepartmentNameById,
  getDescendantDepartments,
  getAncestorDepartments,
  getParentDepartment,
  getChildDepartments,
  getSiblingDepartments,
  getParentAndItsDescendants,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  delete: deleteApi,
  update: updateApi,
  get: getApi,
  tree: treeApi,
};
