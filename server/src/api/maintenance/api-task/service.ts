import db from "@/db/index";
import {
  apiTaskTable,
  IndexVO,
  ApiTaskVO,
  ApiTaskListVO,
  ApiTaskAddVO,
  ApiTaskUpdateVO,
  ApiTaskListKeys,
  ApiTaskDetailKeys,
  ApiTaskGetKeys,
  ApiTaskDeleteKeys,
  ApiTaskAddKeys,
  ApiTaskUpdateKeys,
  ApiTaskSortableKeys,
  type ApiTaskPOLike,
  type ApiTaskVOLike,
  type ApiTaskAddVOLike,
  type ApiTaskUpdateVOLike,
  type ApiTaskDeleteVOLike,
  type ApiTaskGetVOLike,
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
import { executeApiTask } from "@/jobs/executor";

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
        like(apiTaskTable.name, `%${keyword}%`),
        like(apiTaskTable.taskKey, `%${keyword}%`)
      )
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(apiTaskTable.isEnabled, isEnabled));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

//----------------- 1. 获取任务列表 ----------------//
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: { type: "boolean", description: "是否启用" },
    orderBy: orderByWrapper<(keyof ApiTaskPOLike)[]>(ApiTaskSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<ApiTaskPOLike>[]>({ ...ApiTaskListVO }, [
    ...ApiTaskListKeys,
  ]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = apiTaskTable[orderBy] || apiTaskTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const whereCondition = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(apiTaskTable.id) })
    .from(apiTaskTable)
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

  const rows = await db
    .select()
    .from(apiTaskTable)
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
    summary: "获取 API Task 列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

//----------------- 2. 新增任务 ----------------//
const addReq = {
  type: "object",
  properties: {
    ...ApiTaskAddVO,
  } satisfies Partial<Record<keyof ApiTaskAddVOLike, JSONSchema>>,
  required: [
    ...ApiTaskAddKeys,
  ] as const satisfies RequiredKeys<ApiTaskAddVOLike>[],
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
  const {
    taskKey,
    name,
    description,
    baseUrl,
    path,
    method,
    headers,
    requestSchema,
    responseSchema,
    timeoutMs,
    isEnabled,
  } = params;

  const existRows = await db
    .select()
    .from(apiTaskTable)
    .where(eq(apiTaskTable.taskKey, taskKey))
    .limit(1);
  if (existRows.length > 0) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `任务 Key "${taskKey}" 已存在，请换用其他唯一 Key`,
    });
  }

  const res = await db
    .insert(apiTaskTable)
    .values({
      taskKey,
      name,
      description,
      baseUrl,
      path,
      method,
      headers,
      requestSchema,
      responseSchema,
      timeoutMs,
      isEnabled,
      creatorId,
    })
    .returning({ id: apiTaskTable.id });

  return res[0]?.id;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加 API Task",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

//----------------- 3. 更新任务 ----------------//
const updateReq = {
  type: "object",
  properties: { ...ApiTaskUpdateVO },
  required: [
    ...ApiTaskUpdateKeys,
  ] as const satisfies RequiredKeys<ApiTaskUpdateVOLike>[],
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
  const {
    id,
    taskKey,
    name,
    description,
    baseUrl,
    path,
    method,
    headers,
    requestSchema,
    responseSchema,
    timeoutMs,
    isEnabled,
  } = params;

  const existRows = await db
    .select()
    .from(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
    .limit(1);
  const row = existRows[0];
  preventEmpty(row);

  if (taskKey !== undefined && taskKey !== row.taskKey) {
    const duplicateRows = await db
      .select()
      .from(apiTaskTable)
      .where(eq(apiTaskTable.taskKey, taskKey))
      .limit(1);
    if (duplicateRows.length > 0) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `任务 Key "${taskKey}" 已存在，请换用其他唯一 Key`,
      });
    }
  }

  const res = await db
    .update(apiTaskTable)
    .set({
      taskKey,
      name,
      description,
      baseUrl,
      path,
      method,
      headers,
      requestSchema,
      responseSchema,
      timeoutMs,
      isEnabled,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(apiTaskTable.id, id))
    .returning({ id: apiTaskTable.id });

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
    summary: "更新 API Task",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

//----------------- 4. 删除任务 ----------------//
const deleteReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [
    ...ApiTaskDeleteKeys,
  ] as const satisfies RequiredKeys<ApiTaskDeleteVOLike>[],
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
    .from(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
    .limit(1);
  preventEmpty(existRows[0]);

  const result = await db
    .delete(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
    .returning({ id: apiTaskTable.id });
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
    summary: "删除 API Task",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

//----------------- 5. 获取任务详情 ----------------//
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [
    ...ApiTaskGetKeys,
  ] as const satisfies RequiredKeys<ApiTaskGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: { ...ApiTaskVO },
  required: [
    ...ApiTaskDetailKeys,
  ] as const satisfies RequiredKeys<ApiTaskVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
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
    summary: "获取 API Task 详情",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

//----------------- 6. 立即测试执行 ----------------//
const runTestReq = {
  type: "object",
  properties: {
    id: { type: "number", description: "任务ID" },
    parameters: {
      type: ["string", "null"],
      nullable: true,
      description: "JSON 入参（覆盖默认参数）",
    },
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const runTestRes = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    statusCode: { type: "number" },
    durationMs: { type: "number" },
    responseBody: { type: ["string", "null"], nullable: true },
    errorMessage: { type: ["string", "null"], nullable: true },
  },
  required: ["success", "statusCode", "durationMs"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onRunTest(
  params: FromSchema<typeof runTestReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof runTestRes>> {
  const { id, parameters } = params;

  const rows = await db
    .select()
    .from(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
    .limit(1);
  const task = rows[0];
  preventEmpty(task);

  let parsedParams: Record<string, unknown> = {};
  if (parameters) {
    try {
      parsedParams = JSON.parse(parameters) as Record<string, unknown>;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `无效的 JSON 参数: ${msg}`,
      });
    }
  }

  const startTime = Date.now();
  const result = await executeApiTask(task, parsedParams);
  const durationMs = Date.now() - startTime;

  return {
    success: result.success,
    statusCode: result.statusCode,
    durationMs,
    responseBody: result.responseBody,
    errorMessage: result.success ? null : `HTTP ${result.statusCode}`,
  };
}

const runTestApi = {
  req: runTestReq,
  res: runTestRes,
  pathInfo: {
    path: "/runTest",
    method: "post",
    summary: "立即测试执行 API Task",
  } as const,
  adapter: bodyUserAdapter,
  service: onRunTest,
  permission: { action: "edit" },
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
