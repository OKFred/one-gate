import db from "@/db/index";
import {
  departmentTable,
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
} from "./db.table";
import { utils as userUtils } from "@/api/system/user/service";
import { asc, count, desc, eq, like, and, SQL, inArray } from "drizzle-orm";
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
import { bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import { exportDeletionRecord } from "@/api/operation_maintenance/compliance";

const presetRules = {
  /** 访问已启用的数据 */
  accessEnabledData: () => {
    return eq(departmentTable.isEnabled, true);
  },
  /** 允许访问自己创建的数据 */
  accessOwnData: (userObj: UserObj) => {
    return eq(departmentTable.creatorId, userObj.userId);
  },
  /** 允许访问父部门及其子孙部门的数据 */
  accessParentAndItsDescendants: async (
    userObj: UserObj
  ): Promise<SQL | undefined> => {
    const parentAndDescendants = await getParentAndItsDescendants(
      userObj.departmentObj?.value
    );
    if (!parentAndDescendants || parentAndDescendants.length === 0) {
      return undefined;
    }
    const ids = parentAndDescendants.map((dept) => dept.id);
    return inArray(departmentTable.id, ids);
  },
};

async function applyDataPermission(
  userObj: UserObj,
  filterNames: string[],
  baseConditions: (SQL | undefined)[]
): Promise<SQL | undefined> {
  const whereConditions = [...baseConditions];
  for (const filterName of filterNames) {
    let filterCondition: SQL | undefined;
    switch (filterName) {
      case "parentAndItsDescendants":
        filterCondition =
          await presetRules.accessParentAndItsDescendants(userObj);
        break;
      default:
        break;
    }
    if (filterCondition) {
      whereConditions.push(filterCondition);
    }
  }
  if (whereConditions.length === 0) {
    return undefined;
  }
  return whereConditions.length === 1
    ? whereConditions[0]
    : and(...(whereConditions as SQL[]));
}

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
  parentId,
}: Pick<FromSchema<typeof listReq>, "keyword" | "isEnabled" | "parentId">) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(like(departmentTable.name, `%${keyword}%`));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(departmentTable.isEnabled, isEnabled));
  }
  if (parentId !== undefined) {
    conditions.push(eq(departmentTable.parentId, parentId));
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
  userObj: UserObj
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = departmentTable[orderBy] || departmentTable.id;
  const maxLimit = 10000; // 设置最大返回数量限制，防止数据过大

  // 构建基础查询条件
  const baseCondition = buildWhereCondition(params);
  const baseConditions = baseCondition ? [baseCondition] : [];

  // 应用数据权限过滤
  const whereCondition = await applyDataPermission(
    userObj,
    ["parentAndItsDescendants"],
    baseConditions
  );

  // 查询所有匹配的数据
  const rows = await db
    .select({
      id: departmentTable.id,
      name: departmentTable.name,
      remark: departmentTable.remark,
      parentId: departmentTable.parentId,
      isEnabled: departmentTable.isEnabled,
    })
    .from(departmentTable)
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
    summary: "获取所有部门（不分页）",
  } as const,
  adapter: bodyUserAdapter,
  service: onListAll,
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
  userObj: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = departmentTable[orderBy] || departmentTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建基础查询条件
  const baseCondition = buildWhereCondition(params);
  const baseConditions = baseCondition ? [baseCondition] : [];

  // 应用数据权限过滤
  const whereCondition = await applyDataPermission(
    userObj,
    ["parentAndItsDescendants"],
    baseConditions
  );

  // 查询总数
  const countResult = await db
    .select({ total: count(departmentTable.id) })
    .from(departmentTable)
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
    .from(departmentTable)
    .where(whereCondition)
    .orderBy(descend ? desc(orderField) : asc(orderField))
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
    summary: "获取部门列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
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
  const { name, remark, parentId, isEnabled = true } = params;
  // 如果有父部门，检查父部门是否存在
  if (hasValue(parentId)) {
    const parent = await db
      .select()
      .from(departmentTable)
      .where(eq(departmentTable.id, parentId))
      .limit(1);

    if (parent.length === 0) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }
  }
  const res = await db
    .insert(departmentTable)
    .values({
      name,
      remark,
      parentId,
      isEnabled,
      creatorId,
    })
    .returning({ id: departmentTable.id });

  return res[0]?.id;
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

  // 先检查是否有权限访问该部门
  const whereCondition = await applyDataPermission(
    userObj,
    ["parentAndItsDescendants"],
    [eq(departmentTable.id, id)]
  );

  const rows = await db
    .select()
    .from(departmentTable)
    .where(whereCondition)
    .limit(1);

  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }

  // 如果要禁用部门，先检查是否满足禁用条件
  if (rest.isEnabled === false && rows[0].isEnabled === true) {
    await checkCanDisableDepartment(id);
  }

  // 如果更新父部门，检查是否会造成循环引用
  if (rest.parentId) {
    // 不能将自己设为父部门
    if (rest.parentId === id) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    }

    // 检查父部门是否存在
    const parent = await db
      .select()
      .from(departmentTable)
      .where(eq(departmentTable.id, rest.parentId))
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

  const res = await db
    .update(departmentTable)
    .set(updateData)
    .where(eq(departmentTable.id, id))
    .returning({ id: departmentTable.id });

  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return res[0].id;
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

  // 先检查是否有权限访问该部门
  const whereCondition = await applyDataPermission(
    userObj,
    ["parentAndItsDescendants"],
    [eq(departmentTable.id, id)]
  );

  const rows = await db
    .select()
    .from(departmentTable)
    .where(whereCondition)
    .limit(1);

  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }

  // 如果要删除部门，先检查是否满足删除条件
  
  // 1. 检查当前部门下是否存在在职人员
  const employeeCount = await userUtils.countEnabledEmployeesInDepartments([id]);
  if (employeeCount > 0) {
    throw new BusinessError(BusinessErrorCode.DEPARTMENT_HAS_ENABLED_EMPLOYEES);
  }

  // 2. 检查是否有子部门
  const children = await db
    .select()
    .from(departmentTable)
    .where(eq(departmentTable.parentId, id))
    .limit(1);

  if (children.length > 0) {
    throw new BusinessError(BusinessErrorCode.HAS_CHILDREN);
  }

  // 执行删除操作
  const result = await db
    .delete(departmentTable)
    .where(eq(departmentTable.id, id))
    .returning({ id: departmentTable.id });

  if (!result || result.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }

  // 归档删除记录
  try {
    await exportDeletionRecord(
      {
        sourceTable: "department",
        sourcePrimaryKey: String(id),
        deleteReason: "system",
        deleteType: "purge",
        recordSnapshot: JSON.stringify(rows[0]),
        remark: `部门"${rows[0].name}"被删除`,
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

  return result[0].id;
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
  userObj: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;

  // 应用数据权限过滤
  const whereCondition = await applyDataPermission(
    userObj,
    ["parentAndItsDescendants"],
    [eq(departmentTable.id, id)]
  );

  const rows = await db
    .select()
    .from(departmentTable)
    .where(whereCondition)
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
    summary: "获取部门信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
} satisfies API;

const treeReq = {
  type: "object",
  properties: {
    showAll: {
      description: "是否显示所有部门（包括未启用的）",
      type: "boolean",
    },
  },
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
  const { showAll } = params;

  // 构建基础查询条件
  const baseConditions = [];
  if (showAll !== true) {
    baseConditions.push(eq(departmentTable.isEnabled, true)); // 默认只查询启用的部门
  }

  // 应用数据权限过滤
  const whereCondition = await applyDataPermission(
    userObj,
    ["parentAndItsDescendants"],
    baseConditions
  );

  // 获取所有部门
  const allDepartments = await db
    .select()
    .from(departmentTable)
    .where(whereCondition)
    .orderBy(asc(departmentTable.id));

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
} satisfies API;

/** @description 根据ID获取部门名称 */
async function getDepartmentNameById(id: number): Promise<string | null> {
  const rows = await db
    .select({ name: departmentTable.name })
    .from(departmentTable)
    .where(eq(departmentTable.id, id))
    .limit(1);
  return rows.length > 0 ? rows[0].name : null;
}

/** @description 获取所有部门列表 */
async function getAllDepartments(
  isEnabled?: boolean
): Promise<{ name: string; id: number; parentId: number }[]> {
  const allDepartments = await db
    .select({
      name: departmentTable.name,
      id: departmentTable.id,
      parentId: departmentTable.parentId,
    })
    .from(departmentTable)
    .where(
      isEnabled !== undefined
        ? eq(departmentTable.isEnabled, isEnabled)
        : undefined
    );
  return allDepartments;
}

/** @description 获取子孙部门的列表 */
async function getDescendantDepartments(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number }[] | null> {
  if (!departmentId) return null;
  const allDepartments = await getAllDepartments(true);
  const thisDepartment = allDepartments.find(
    (dept) => dept.id === departmentId
  );
  if (!thisDepartment) return null;
  // 递归查找子部门
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
async function getAncestorDepartments(departmentId: number): Promise<
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
async function getParentDepartment(
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

async function getParentAndItsDescendants(
  departmentId: number
): Promise<{ name: string; id: number; parentId: number }[] | null> {
  const parentDepartment = await getParentDepartment(departmentId);
  if (!parentDepartment) return null;
  const descendants = await getDescendantDepartments(parentDepartment.id);
  return [parentDepartment, ...(descendants || [])];
}

/** @description 获取同辈部门的列表 */
async function getSiblingDepartments(
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
async function verifyDepartment(departmentId: number) {
  const departmentName = await getDepartmentNameById(departmentId);
  if (!departmentName) {
    throw new BusinessError(BusinessErrorCode["DEPARTMENT_NOT_EXIST"]);
  }
}

/** 检查部门是否可以被禁用 */
async function checkCanDisableDepartment(departmentId: number): Promise<void> {
  // 1. 检查当前部门及所有子孙部门下是否存在在职人员
  const descendants = await getDescendantDepartments(departmentId);
  const allDepartmentIds = [
    departmentId,
    ...(descendants?.map((d) => d.id) || []),
  ];

  // 查询这些部门下的在职人员数量
  const employeeCount =
    await userUtils.countEnabledEmployeesInDepartments(allDepartmentIds);

  if (employeeCount > 0) {
    throw new BusinessError(BusinessErrorCode.DEPARTMENT_HAS_ENABLED_EMPLOYEES);
  }

  // 2. 检查是否存在未禁用的子部门
  const enabledChildren = await db
    .select({ count: count(departmentTable.id) })
    .from(departmentTable)
    .where(
      and(
        eq(departmentTable.parentId, departmentId),
        eq(departmentTable.isEnabled, true)
      )
    );

  if (enabledChildren[0]?.count > 0) {
    throw new BusinessError(BusinessErrorCode.DEPARTMENT_HAS_ENABLED_CHILDREN);
  }
}

export const utils = {
  verifyDepartment,
  getDepartmentNameById,
  getDescendantDepartments,
  getAncestorDepartments,
  getParentDepartment,
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
