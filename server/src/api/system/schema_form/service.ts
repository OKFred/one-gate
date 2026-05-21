import db from "@/db/index";
import { utils as userUtils } from "@/api/system/user/service";
import {
  schemaFormTable,
  IndexVO,
  SchemaFormVO,
  SchemaFormListVO,
  SchemaFormAddVO,
  SchemaFormUpdateVO,
  SchemaFormListKeys,
  SchemaFormDetailKeys,
  SchemaFormGetKeys,
  SchemaFormDeleteKeys,
  SchemaFormAddKeys,
  SchemaFormUpdateKeys,
  SchemaFormSortableKeys,
  type SchemaFormPOLike,
  type SchemaFormVOLike,
  type SchemaFormAddVOLike,
  type SchemaFormUpdateVOLike,
  type SchemaFormDeleteVOLike,
  type SchemaFormGetVOLike,
  SchemaFormBaseVO,
} from "./model";
import { asc, count, desc, eq, or, and, like, inArray } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
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
import { preventEmpty } from "@/middleware/auth/prevention";
import hasValue from "@/utils/hasValue";

// 构建查询条件
export const buildWhereCondition = (condition?: {
  id?: number;
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { id, keyword, isEnabled } = condition || {};
  const conditions = [];

  if (hasValue(id)) {
    conditions.push(eq(schemaFormTable.id, id!));
  }
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(schemaFormTable.name, `%${keyword}%`),
        like(schemaFormTable.code, `%${keyword}%`)
      )
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(schemaFormTable.isEnabled, isEnabled));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: SchemaFormVO["isEnabled"],
    orderBy: orderByWrapper<(keyof SchemaFormPOLike)[]>(SchemaFormSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<SchemaFormPOLike>[]>(
    {
      ...SchemaFormListVO,
    },
    [...SchemaFormListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = schemaFormTable[orderBy] || schemaFormTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const whereCondition = buildWhereCondition(params);

  // 查询总数
  const countResult = await db
    .select({ total: count(schemaFormTable.id).as("total") })
    .from(schemaFormTable)
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
    .from(schemaFormTable)
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
    summary: "获取动态表单配置列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...SchemaFormAddVO,
  } satisfies Partial<Record<keyof SchemaFormAddVOLike, JSONSchema>>,
  required: [
    ...SchemaFormAddKeys,
  ] as const satisfies RequiredKeys<SchemaFormAddVOLike>[],
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
  const creatorName = await userUtils.getUserNameById(creatorId);

  const updateData = {
    ...params,
    creatorId,
    creatorName,
  };
  const res = await db
    .insert(schemaFormTable)
    .values(updateData)
    .returning({ id: schemaFormTable.id });
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
    summary: "添加动态表单配置",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...SchemaFormUpdateVO,
  },
  required: [
    ...SchemaFormUpdateKeys,
  ] as const satisfies RequiredKeys<SchemaFormUpdateVOLike>[],
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

  // 获取当前记录
  const current = await db
    .select()
    .from(schemaFormTable)
    .where(eq(schemaFormTable.id, id))
    .limit(1);
  const currentForm = current[0];
  preventEmpty(currentForm);
  const updaterName = await userUtils.getUserNameById(updaterId);

  const updateData = {
    ...rest,
    updaterId,
    updaterName,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(schemaFormTable)
    .set(updateData)
    .where(eq(schemaFormTable.id, id))
    .returning({ id: schemaFormTable.id });

  const result = res[0];
  preventEmpty(result);
  return result?.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新动态表单配置",
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
    ...SchemaFormDeleteKeys,
  ] as const satisfies RequiredKeys<SchemaFormDeleteVOLike>[],
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

  const res = await db
    .delete(schemaFormTable)
    .where(eq(schemaFormTable.id, id))
    .returning({ id: schemaFormTable.id });
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
    summary: "删除动态表单配置",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    id: { type: "number" },
    code: { type: "string" },
  },
  anyOf: [{ required: ["id"] }, { required: ["code"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...SchemaFormVO,
  },
  required: [
    ...SchemaFormDetailKeys,
  ] as const satisfies RequiredKeys<SchemaFormVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id, code } = params;

  const conditions = [];
  if (id) conditions.push(eq(schemaFormTable.id, id));
  if (code) conditions.push(eq(schemaFormTable.code, code));

  const rows = await db
    .select()
    .from(schemaFormTable)
    .where(or(...conditions))
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
    summary: "获取动态表单配置信息",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
