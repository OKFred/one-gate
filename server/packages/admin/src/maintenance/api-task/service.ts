import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { validate } from "@cfworker/json-schema";
import { adminMaintenanceApiTaskBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { executeApiTask } from "../cron/executor.js";
import * as apiTaskRepository from "./repository";

const S = adminMaintenanceApiTaskBackendSchemas;
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function onList(
  params: FromSchema<typeof S.listReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof S.listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await apiTaskRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(
    list.map((row) => ({
      ...row,
      method: row.method as HttpMethod,
    })),
    total,
    pageNo,
    finalPageSize
  );
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: creatorId } = userObj;
  const {
    taskKey,
    name,
    description,
    baseUrl,
    path,
    method = "GET",
    headers,
    requestSchema,
    responseSchema,
    timeoutMs = 30000,
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

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
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

async function onDelete(
  params: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number> {
  const { id } = params;
  const existRow = await apiTaskRepository.findById(id);
  preventEmpty(existRow);

  const deleteRow = await apiTaskRepository.onDelete(id);
  preventEmpty(deleteRow);
  return deleteRow.id;
}

async function onGet(
  params: FromSchema<typeof S.getReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = params;
  const row = await apiTaskRepository.findById(id);
  preventEmpty(row);
  return {
    ...row,
    method: row.method as HttpMethod,
  };
}

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
  _userObj?: UserObj
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
        } catch {
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
        method: (task.method || "GET") as HttpMethod,
        headers: task.headers || null,
        requestSchema: task.requestSchema || null,
        responseSchema: task.responseSchema || null,
        timeoutMs: task.timeoutMs ?? 30000,
        isEnabled: task.isEnabled ?? true,
        creatorId,
      });

      successCount++;
    } catch (err: unknown) {
      errors.push({
        taskKey: task.taskKey,
        message: err instanceof Error ? err.message : String(err),
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

export default createCrudApis(S, {
  list: {
    adapter: bodyUserAdapter,
    summary: "获取 API Task 列表",
    handler: onList,
  },
  add: { summary: "添加 API Task", handler: onAdd },
  update: { summary: "更新 API Task", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除 API Task",
    handler: onDelete,
  },
  get: {
    adapter: bodyUserAdapter,
    summary: "获取 API Task 详情",
    handler: onGet,
  },
  extra: {
    runTest: runTestApi,
    bulkAdd: bulkAddApi,
  },
});
