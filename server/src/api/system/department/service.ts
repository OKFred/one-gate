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
  type DepartmentPOLike,
  type DepartmentVOLike,
  type DepartmentAddVOLike,
  type DepartmentUpdateVOLike,
  type DepartmentDeleteVOLike,
  type DepartmentGetVOLike,
} from "./db.table";
import { asc, count, desc, eq, like, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
import {
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

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    orderBy: orderByWrapper<(keyof DepartmentPOLike)[]>([
      "id",
      "name",
      "createTimeUtc",
    ]),
    isEnabled: { type: "boolean", description: "是否启用状态过滤" },
    parentId: {
      type: "number",
      description: "父部门ID过滤",
      minimum: 1,
    },
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
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
    isEnabled,
    parentId,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = departmentTable[orderBy] || departmentTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;
  // 构建查询条件
  const buildWhereCondition = () => {
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
  // 查询总数
  const countResult = await db
    .select({ total: count(departmentTable.id) })
    .from(departmentTable)
    .where(buildWhereCondition());
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
    .where(buildWhereCondition())
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
  adapter: bodyAdapter,
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
  const { name, description, parentId, isEnabled = true } = params;
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
      description,
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

  // 检查是否有子部门
  const children = await db
    .select()
    .from(departmentTable)
    .where(eq(departmentTable.parentId, id))
    .limit(1);

  if (children.length > 0) {
    throw new BusinessError(BusinessErrorCode.HAS_CHILDREN);
  }

  const result = await db
    .delete(departmentTable)
    .where(eq(departmentTable.id, id))
    .returning({ id: departmentTable.id });

  if (!result || result.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
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
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(departmentTable)
    .where(eq(departmentTable.id, id))
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
  adapter: bodyAdapter,
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
  params: FromSchema<typeof treeReq>
): Promise<DepartmentTreeItem[]> {
  const { showAll } = params;

  // 构建查询条件
  const buildWhereCondition = () => {
    if (showAll !== true) {
      return eq(departmentTable.isEnabled, true); // 默认只查询启用的部门
    }
    return undefined;
  };

  // 获取所有部门
  const allDepartments = await db
    .select()
    .from(departmentTable)
    .where(buildWhereCondition())
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
  adapter: bodyAdapter,
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

async function verifyDepartment(departmentId: number) {
  const departmentName = await getDepartmentNameById(departmentId);
  if (!departmentName) {
    throw new BusinessError(BusinessErrorCode["DEPARTMENT_NOT_EXIST"]);
  }
}

export const utils = {
  getDepartmentNameById,
  verifyDepartment,
};

export default {
  list: listApi,
  add: addApi,
  delete: deleteApi,
  update: updateApi,
  get: getApi,
  tree: treeApi,
};
