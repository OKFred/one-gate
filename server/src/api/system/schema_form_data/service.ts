import db from "@/db/index";
import { utils as userUtils } from "@/api/system/user/service";
import {
  schemaFormDataTable,
  IndexVO,
  SchemaFormDataVO,
  SchemaFormDataListVO,
  SchemaFormDataListKeys,
  SchemaFormDataDetailKeys,
  SchemaFormDataGetKeys,
  SchemaFormDataDeleteKeys,
  SchemaFormDataAddKeys,
  SchemaFormDataSortableKeys,
  type SchemaFormDataPOLike,
  type SchemaFormDataDeleteVOLike,
} from "./model";
import { schemaFormTable } from "../schema_form/model";
import { asc, count, desc, eq, and, or } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import { validate } from "@cfworker/json-schema";
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
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";

// 构建查询条件
export const buildWhereCondition = (condition?: {
  id?: number;
  formCode?: string;
  businessId?: number;
}) => {
  const { id, formCode, businessId } = condition || {};
  const conditions = [];

  if (hasValue(id)) {
    conditions.push(eq(schemaFormDataTable.id, id!));
  }
  if (hasValue(formCode)) {
    conditions.push(eq(schemaFormDataTable.formCode, formCode!));
  }
  if (hasValue(businessId)) {
    conditions.push(eq(schemaFormDataTable.businessId, businessId!));
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
    formCode: SchemaFormDataVO["formCode"],
    businessId: SchemaFormDataVO["businessId"],
    orderBy: orderByWrapper<(keyof SchemaFormDataPOLike)[]>(
      SchemaFormDataSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<SchemaFormDataPOLike>[]>(
    {
      ...SchemaFormDataListVO,
    },
    [...SchemaFormDataListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = schemaFormDataTable[orderBy] || schemaFormDataTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const whereCondition = buildWhereCondition(params);

  // 查询总数
  const countResult = await db
    .select({ total: count(schemaFormDataTable.id).as("total") })
    .from(schemaFormDataTable)
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
    .from(schemaFormDataTable)
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
    summary: "获取动态表单提交的数据列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const submitReq = {
  type: "object",
  properties: {
    formCode: { type: "string", minLength: 1 },
    businessId: { type: "number" },
    data: {
      type: "object",
      description: "表单数据 (JSON 对象)",
      additionalProperties: true,
    },
  },
  required: ["formCode", "businessId", "data"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const submitRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onSubmit(
  params: FromSchema<typeof submitReq>,
  userObj: UserObj
): Promise<FromSchema<typeof submitRes> | null> {
  const { userId: creatorId } = userObj;
  const { formCode, businessId, data } = params;

  // 1. 根据 formCode 获取对应的 Schema 配置
  const formConfigs = await db
    .select()
    .from(schemaFormTable)
    .where(
      and(
        eq(schemaFormTable.code, formCode),
        eq(schemaFormTable.isEnabled, true)
      )
    )
    .limit(1);

  const formConfig = formConfigs[0];
  if (!formConfig) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: [`Schema Form Config not found or disabled for code: ${formCode}`],
    });
  }

  let schemaObj: object;
  try {
    schemaObj = JSON.parse(formConfig.schemaData);
  } catch (e) {
    throw new BusinessError(BusinessErrorCode.UNKNOWN_ERROR, {
      cause: ["Failed to parse Schema Form Data from DB"],
    });
  }

  // 2. 动态校验 JSON Schema
  const { valid, errors } = validate(data, schemaObj, "2020-12");
  if (!valid) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: errors, // 将具体的 schema 校验错误抛给前端
    });
  }

  const dataContent = JSON.stringify(data);

  // 获取当前操作人的用户名
  const username = await userUtils.getUserNameById(creatorId);

  // 3. 检查是否已经存在相同 formCode + businessId 的记录，如果存在则更新(upsert)
  const existData = await db
    .select()
    .from(schemaFormDataTable)
    .where(
      and(
        eq(schemaFormDataTable.formCode, formCode),
        eq(schemaFormDataTable.businessId, businessId)
      )
    )
    .limit(1);

  if (existData.length > 0) {
    const record = existData[0];
    const res = await db
      .update(schemaFormDataTable)
      .set({
        dataContent,
        updaterId: creatorId,
        updaterName: username,
        updateTimeUtc: getCurrentTimestampUtcSql(),
      })
      .where(eq(schemaFormDataTable.id, record.id))
      .returning({ id: schemaFormDataTable.id });
    return res[0]?.id || null;
  } else {
    // 插入新数据
    const res = await db
      .insert(schemaFormDataTable)
      .values({
        formCode,
        businessId,
        dataContent,
        creatorId,
        creatorName: username,
      })
      .returning({ id: schemaFormDataTable.id });
    return res[0]?.id || null;
  }
}

const submitApi = {
  req: submitReq,
  res: submitRes,
  pathInfo: {
    path: "/submit",
    method: "post",
    summary: "提交动态表单数据",
  } as const,
  adapter: bodyUserAdapter,
  service: onSubmit,
  permission: { action: "add" }, // 如果需要更细粒度的控制，可以在前端针对不同的业务调整权限点
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...SchemaFormDataDeleteKeys,
  ] as const satisfies RequiredKeys<SchemaFormDataDeleteVOLike>[],
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
    .delete(schemaFormDataTable)
    .where(eq(schemaFormDataTable.id, id))
    .returning({ id: schemaFormDataTable.id });
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
    summary: "删除动态表单数据",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    id: { type: "number" },
    formCode: { type: "string" },
    businessId: { type: "number" },
  },
  anyOf: [{ required: ["id"] }, { required: ["formCode", "businessId"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...SchemaFormDataVO,
  },
  required: [
    ...SchemaFormDataDetailKeys,
  ] as const satisfies RequiredKeys<SchemaFormDataPOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id, formCode, businessId } = params;

  const conditions = [];
  if (id) conditions.push(eq(schemaFormDataTable.id, id));
  if (formCode && businessId) {
    conditions.push(
      and(
        eq(schemaFormDataTable.formCode, formCode),
        eq(schemaFormDataTable.businessId, businessId)
      )
    );
  }

  const rows = await db
    .select()
    .from(schemaFormDataTable)
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
    summary: "获取动态表单数据详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

export default {
  list: listApi,
  submit: submitApi,
  delete: deleteApi,
  get: getApi,
};
