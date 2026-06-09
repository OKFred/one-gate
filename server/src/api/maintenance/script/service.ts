import db from "@/db/index";
import {
  jsScriptTable,
  IndexVO,
  JsScriptVO,
  JsScriptListVO,
  JsScriptAddVO,
  JsScriptUpdateVO,
  JsScriptListKeys,
  JsScriptDetailKeys,
  JsScriptGetKeys,
  JsScriptDeleteKeys,
  JsScriptAddKeys,
  JsScriptUpdateKeys,
  JsScriptSortableKeys,
  type JsScriptPOLike,
  type JsScriptVOLike,
  type JsScriptAddVOLike,
  type JsScriptUpdateVOLike,
  type JsScriptDeleteVOLike,
  type JsScriptGetVOLike,
} from "./model";
import { asc, count, desc, eq, and, like, or } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import hasValue from "@/utils/hasValue";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@/middleware/auth/prevention";
import { executeJsScript } from "@/jobs/executor";

// 辅助函数：根据条件构建查询 filter
const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(jsScriptTable.name, `%${keyword}%`),
        like(jsScriptTable.scriptKey, `%${keyword}%`)
      )
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(jsScriptTable.isEnabled, isEnabled));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

//----------------- 1. 获取脚本列表 ----------------//
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: { type: "boolean", description: "是否启用" },
    orderBy: orderByWrapper<(keyof JsScriptPOLike)[]>(JsScriptSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<JsScriptPOLike>[]>(
    {
      ...JsScriptListVO,
    },
    [...JsScriptListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = jsScriptTable[orderBy] || jsScriptTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const whereCondition = buildWhereCondition(params);

  // 查询总数
  const countResult = await db
    .select({ total: count(jsScriptTable.id) })
    .from(jsScriptTable)
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

  // 查询数据
  const rows = await db
    .select()
    .from(jsScriptTable)
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
    summary: "获取JS脚本列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

//----------------- 2. 新增脚本 ----------------//
const addReq = {
  type: "object",
  properties: {
    ...JsScriptAddVO,
  } satisfies Partial<Record<keyof JsScriptAddVOLike, JSONSchema>>,
  required: [
    ...JsScriptAddKeys,
  ] as const satisfies RequiredKeys<JsScriptAddVOLike>[],
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
  const { scriptKey, name, description, code, isEnabled } = params;

  // 校验 scriptKey 唯一性
  const existRows = await db
    .select()
    .from(jsScriptTable)
    .where(eq(jsScriptTable.scriptKey, scriptKey))
    .limit(1);
  if (existRows.length > 0) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `脚本 Key "${scriptKey}" 已存在，请换用其他唯一 Key`,
    });
  }

  const res = await db
    .insert(jsScriptTable)
    .values({
      scriptKey,
      name,
      description,
      code,
      isEnabled,
      creatorId,
    })
    .returning({ id: jsScriptTable.id });

  return res[0]?.id;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加JS脚本",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

//----------------- 3. 更新脚本 ----------------//
const updateReq = {
  type: "object",
  properties: {
    ...JsScriptUpdateVO,
  },
  required: [
    ...JsScriptUpdateKeys,
  ] as const satisfies RequiredKeys<JsScriptUpdateVOLike>[],
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
  const { id, scriptKey, name, description, code, isEnabled } = params;

  // 前置校验脚本是否存在
  const existRows = await db
    .select()
    .from(jsScriptTable)
    .where(eq(jsScriptTable.id, id))
    .limit(1);
  const row = existRows[0];
  preventEmpty(row);

  // 如果修改了 scriptKey，校验唯一性
  if (scriptKey !== undefined && scriptKey !== row.scriptKey) {
    const duplicateKeyRows = await db
      .select()
      .from(jsScriptTable)
      .where(eq(jsScriptTable.scriptKey, scriptKey))
      .limit(1);
    if (duplicateKeyRows.length > 0) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `脚本 Key "${scriptKey}" 已存在，请换用其他唯一 Key`,
      });
    }
  }

  const updateData = {
    scriptKey,
    name,
    description,
    code,
    isEnabled,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(jsScriptTable)
    .set(updateData)
    .where(eq(jsScriptTable.id, id))
    .returning({ id: jsScriptTable.id });

  const updateRow = res[0];
  preventEmpty(updateRow);
  return updateRow.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新JS脚本",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

//----------------- 4. 删除脚本 ----------------//
const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...JsScriptDeleteKeys,
  ] as const satisfies RequiredKeys<JsScriptDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;

  const existRows = await db
    .select()
    .from(jsScriptTable)
    .where(eq(jsScriptTable.id, id))
    .limit(1);
  const row = existRows[0];
  preventEmpty(row);

  const result = await db
    .delete(jsScriptTable)
    .where(eq(jsScriptTable.id, id))
    .returning({ id: jsScriptTable.id });

  const deleteRow = result[0];
  preventEmpty(deleteRow);

  return deleteRow.id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除JS脚本",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

//----------------- 5. 获取脚本详情 ----------------//
const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...JsScriptGetKeys,
  ] as const satisfies RequiredKeys<JsScriptGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...JsScriptVO,
  },
  required: [
    ...JsScriptDetailKeys,
  ] as const satisfies RequiredKeys<JsScriptVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(jsScriptTable)
    .where(eq(jsScriptTable.id, id))
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
    summary: "获取JS脚本详情",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

//----------------- 6. 手动测试运行脚本 ----------------//
const runTestReq = {
  type: "object",
  properties: {
    id: { type: "number", description: "脚本ID" },
    parameters: {
      type: ["string", "null"],
      nullable: true,
      description: "手动指定的 JSON 参数",
    },
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const runTestRes = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    durationMs: { type: "number" },
    errorMessage: { type: ["string", "null"], nullable: true },
    result: { description: "执行结果" },
  },
  required: ["success", "durationMs"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onRunTest(
  params: FromSchema<typeof runTestReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof runTestRes>> {
  const { id, parameters } = params;

  // 获取脚本内容
  const rows = await db
    .select()
    .from(jsScriptTable)
    .where(eq(jsScriptTable.id, id))
    .limit(1);
  const script = rows[0];
  preventEmpty(script);

  let parsedParams = {};
  if (parameters) {
    try {
      parsedParams = JSON.parse(parameters);
    } catch (err: any) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `无效的 JSON 参数: ${err.message}`,
      });
    }
  }

  const startTime = Date.now();
  let success = true;
  let errorMessage: string | null = null;
  let result: any = undefined;

  try {
    result = await executeJsScript(script.code, { params: parsedParams, db });
  } catch (err: any) {
    success = false;
    errorMessage = err.message || String(err);
  }

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  return {
    success,
    durationMs,
    errorMessage,
    result,
  };
}

const runTestApi = {
  req: runTestReq,
  res: runTestRes,
  pathInfo: {
    path: "/runTest",
    method: "post",
    summary: "立即执行JS脚本测试",
  } as const,
  adapter: bodyUserAdapter,
  service: onRunTest,
  permission: { action: "edit" }, // 运行测试需要编辑权限
} satisfies API;

//----------------- 统一导出 ----------------//
export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  runTest: runTestApi,
};
