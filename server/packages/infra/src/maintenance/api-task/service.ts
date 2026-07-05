import {
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
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { validate } from "@cfworker/json-schema";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { executeApiTask } from "@hodor/core/jobs/executor";
import * as apiTaskRepository from "./repository";

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
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await apiTaskRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: list as any,
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

  const existRow = await apiTaskRepository.findByKey(taskKey);
  if (existRow) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `任务 Key "${taskKey}" 已存在，请换用其他唯一 Key`,
    });
  }

  const insertedId = await apiTaskRepository.onInsert({
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
  });

  return insertedId || null;
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

  const row = await apiTaskRepository.findById(id);
  preventEmpty(row);

  if (taskKey !== undefined && taskKey !== row.taskKey) {
    const duplicateRow = await apiTaskRepository.findByKey(taskKey);
    if (duplicateRow) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `任务 Key "${taskKey}" 已存在，请换用其他唯一 Key`,
      });
    }
  }

  const updateRow = await apiTaskRepository.onUpdate(id, {
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
    updateTimeUtc: Date.now(),
  });

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
  const existRow = await apiTaskRepository.findById(id);
  preventEmpty(existRow);

  const deleteRow = await apiTaskRepository.onDelete(id);
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
  const row = await apiTaskRepository.findById(id);
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
    responseHeaders: {
      type: "object",
      additionalProperties: true,
    },
    statusText: { type: ["string", "null"], nullable: true },
    url: { type: ["string", "null"], nullable: true },
    redirected: { type: "boolean" },
    schemaValidation: {
      type: "object",
      properties: {
        hasSchema: { type: "boolean" },
        valid: { type: "boolean" },
        errors: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["hasSchema", "valid"],
      additionalProperties: false,
    },
  },
  required: ["success", "statusCode", "durationMs"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onRunTest(
  params: FromSchema<typeof runTestReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof runTestRes>> {
  const { id, parameters } = params;

  const task = await apiTaskRepository.findById(id);
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

  let schemaValidation = {
    hasSchema: false,
    valid: true,
    errors: [] as string[],
  };

  if (task.responseSchema) {
    try {
      const schemaObj = JSON.parse(task.responseSchema);
      let dataObj: unknown = null;
      let isJson = false;
      if (result.responseBody) {
        try {
          dataObj = JSON.parse(result.responseBody);
          isJson = true;
        } catch (e) {
          // not valid JSON
        }
      }
      if (isJson) {
        const { valid, errors } = validate(dataObj, schemaObj, "2020-12");
        schemaValidation = {
          hasSchema: true,
          valid,
          errors: errors.map((err) => `${err.instanceLocation}: ${err.error}`),
        };
      } else {
        schemaValidation = {
          hasSchema: true,
          valid: false,
          errors: [
            "Response body is not valid JSON, cannot validate against Schema.",
          ],
        };
      }
    } catch (e) {
      schemaValidation = {
        hasSchema: true,
        valid: false,
        errors: [
          `Invalid response schema definition: ${e instanceof Error ? e.message : String(e)}`,
        ],
      };
    }
  }

  return {
    success: result.success,
    statusCode: result.statusCode,
    durationMs,
    responseBody: result.responseBody,
    errorMessage: result.success ? null : `HTTP ${result.statusCode}`,
    responseHeaders: result.headers || {},
    statusText: result.statusText || null,
    url: result.url || null,
    redirected: result.redirected ?? false,
    schemaValidation,
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

//----------------- 7. 批量添加任务 ----------------//
const bulkAddReq = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskKey: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"], nullable: true },
          baseUrl: { type: "string" },
          path: { type: "string" },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
          },
          headers: { type: ["string", "null"], nullable: true },
          requestSchema: { type: ["string", "null"], nullable: true },
          responseSchema: { type: ["string", "null"], nullable: true },
          timeoutMs: { type: "number" },
          isEnabled: { type: "boolean" },
        },
        required: ["taskKey", "name", "baseUrl", "path", "method"],
        additionalProperties: false,
      },
    },
  },
  required: ["tasks"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const bulkAddRes = {
  type: "object",
  properties: {
    successCount: { type: "number" },
    failedCount: { type: "number" },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskKey: { type: "string" },
          message: { type: "string" },
        },
        required: ["taskKey", "message"],
        additionalProperties: false,
      },
    },
  },
  required: ["successCount", "failedCount", "errors"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onBulkAdd(
  params: FromSchema<typeof bulkAddReq>,
  userObj: UserObj
): Promise<FromSchema<typeof bulkAddRes>> {
  const { userId: creatorId } = userObj;
  const { tasks } = params;

  let successCount = 0;
  let failedCount = 0;
  const errors: { taskKey: string; message: string }[] = [];

  for (const task of tasks) {
    try {
      const existRow = await apiTaskRepository.findByKey(task.taskKey);
      if (existRow) {
        errors.push({
          taskKey: task.taskKey,
          message: `任务 Key "${task.taskKey}" 已存在`,
        });
        failedCount++;
        continue;
      }

      await apiTaskRepository.onInsert({
        taskKey: task.taskKey,
        name: task.name,
        description: task.description || null,
        baseUrl: task.baseUrl,
        path: task.path,
        method: task.method as any,
        headers: task.headers || null,
        requestSchema: task.requestSchema || null,
        responseSchema: task.responseSchema || null,
        timeoutMs: task.timeoutMs ?? 30000,
        isEnabled: task.isEnabled ?? true,
        creatorId,
      });

      successCount++;
    } catch (err: any) {
      errors.push({
        taskKey: task.taskKey,
        message: err.message || String(err),
      });
      failedCount++;
    }
  }

  return {
    successCount,
    failedCount,
    errors,
  };
}

const bulkAddApi = {
  req: bulkAddReq,
  res: bulkAddRes,
  pathInfo: {
    path: "/bulkAdd",
    method: "post",
    summary: "批量添加 API Task",
  } as const,
  adapter: bodyUserAdapter,
  service: onBulkAdd,
  permission: { action: "add" },
} satisfies API;

//----------------- 统一导出 ----------------//
export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  runTest: runTestApi,
  bulkAdd: bulkAddApi,
};
