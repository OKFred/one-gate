import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { Context, UserObj } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { getEnv } from "@hodor/core/utils/env";

import mqttService from "../../mqtt/service";
import { mobileDeviceRepo } from "../device/repository";
import {
  MobileAsyncTaskVO,
  MobileAsyncTaskListKeys,
  MobileAsyncTaskDetailKeys,
  MobileAsyncTaskSortableKeys,
  MobileTrustedScriptIds,
  MobileAsyncTaskDispatchReqVO,
  MobileAsyncTaskDispatchResVO,
  MobileAsyncTaskCallbackReqVO,
} from "./model";
import { mobileAsyncTaskRepo } from "./repository";

/** AutoJS6 设备任务协议版本。 */
export const AUTOJS6_PROTOCOL_VERSION = 2 as const;

/** 服务端允许调度的手机可信脚本目录。 */
export const TRUSTED_SCRIPT_CATALOG = {
  "device.apps.list": {
    version: 1,
    defaultTimeoutMs: 120_000,
    maxTimeoutMs: 300_000,
  },
  "app.install": {
    version: 1,
    defaultTimeoutMs: 300_000,
    maxTimeoutMs: 900_000,
  },
  "app.version.check": {
    version: 1,
    defaultTimeoutMs: 60_000,
    maxTimeoutMs: 120_000,
  },
  "app.update.store": {
    version: 1,
    defaultTimeoutMs: 120_000,
    maxTimeoutMs: 300_000,
  },
  "app.update.zip": {
    version: 1,
    defaultTimeoutMs: 600_000,
    maxTimeoutMs: 900_000,
  },
  "file.download": {
    version: 1,
    defaultTimeoutMs: 300_000,
    maxTimeoutMs: 900_000,
  },
  "tiktok.post": {
    version: 1,
    defaultTimeoutMs: 420_000,
    maxTimeoutMs: 900_000,
  },
  "client.self-update": {
    version: 1,
    defaultTimeoutMs: 30_000,
    maxTimeoutMs: 60_000,
  },
} as const satisfies Record<
  (typeof MobileTrustedScriptIds)[number],
  { version: number; defaultTimeoutMs: number; maxTimeoutMs: number }
>;

export type TrustedScriptId = (typeof MobileTrustedScriptIds)[number];

/** 对具有安全边界的脚本参数执行服务端前置校验。 */
function validateTrustedScriptParams(
  scriptId: TrustedScriptId,
  params: Record<string, unknown>
): void {
  const requireString = (key: string): string => {
    const value = params[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new BusinessError(`${scriptId} 必须提供字符串参数 ${key}`);
    }
    return value;
  };
  const requireUrl = (key: string): URL => {
    try {
      return new URL(requireString(key));
    } catch {
      throw new BusinessError(`${scriptId} 的 ${key} 不是有效 URL`);
    }
  };
  if (scriptId === "app.install" || scriptId === "app.update.zip") {
    const downloadUrl = requireUrl("downloadUrl");
    if (downloadUrl.protocol !== "https:") {
      throw new BusinessError(`${scriptId} 仅允许 HTTPS 下载地址`);
    }
  }
  if (scriptId === "device.apps.list") {
    const appType = params.type;
    if (
      appType !== undefined &&
      appType !== "all" &&
      appType !== "third" &&
      appType !== "system"
    ) {
      throw new BusinessError(
        "device.apps.list 的 type 仅支持 all/third/system"
      );
    }
  }
  if (scriptId === "file.download") {
    const downloadUrl = requireUrl("downloadUrl");
    if (downloadUrl.protocol !== "https:" && downloadUrl.protocol !== "http:") {
      throw new BusinessError("file.download 仅允许 HTTP/HTTPS 下载地址");
    }
    if (!requireString("targetPath").startsWith("/sdcard/")) {
      throw new BusinessError("file.download 的 targetPath 必须位于 /sdcard/");
    }
  }
  if (scriptId === "app.update.store") {
    const packageName = requireString("packageName");
    const storePackage = params.storePackage;
    if (
      !/^[A-Za-z0-9._]+$/.test(packageName) ||
      (typeof storePackage === "string" &&
        storePackage.length > 0 &&
        !/^[A-Za-z0-9._]+$/.test(storePackage))
    ) {
      throw new BusinessError("应用包名格式无效");
    }
  }
}

/** 创建可信手机脚本任务所需参数。 */
export interface DispatchTrustedTaskParams {
  clientId: string;
  scriptId: TrustedScriptId;
  params: Record<string, unknown>;
  timeoutMs?: number;
  remark?: string | null;
  callbackUrl?: string;
}

/** 设备上报的 v2 统一任务结果。 */
export interface DeviceTaskResultPayload {
  protocolVersion: 2;
  taskId: string;
  deviceId: string;
  scriptId: string;
  status: "SUCCESS" | "FAILURE" | "TIMEOUT" | "REJECTED" | "CANCELLED";
  code: string;
  message: string;
  data: unknown;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  traceId: string;
}

/** 根据当前下发请求生成同源的设备任务回调地址。 */
export function buildTaskCallbackUrl(requestUrl: string): string {
  const callbackUrl = new URL(requestUrl);
  callbackUrl.pathname = callbackUrl.pathname.replace(
    /\/admin\/.*$/,
    "/admin/mobile/async-task/callback"
  );
  callbackUrl.search = "";
  callbackUrl.hash = "";
  return callbackUrl.toString();
}

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    clientId: MobileAsyncTaskVO.clientId,
    status: MobileAsyncTaskVO.status,
    orderBy: orderByWrapper<(typeof MobileAsyncTaskSortableKeys)[number][]>([
      ...MobileAsyncTaskSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(MobileAsyncTaskVO, [...MobileAsyncTaskListKeys]),
} as const satisfies JSONSchema;

/** 分页查询设备异步任务。 */
async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await mobileAsyncTaskRepo.list({
    keyword: params.keyword,
    clientId: params.clientId,
    status: params.status,
    orderBy: params.orderBy,
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list as unknown as FromSchema<typeof listRes>["list"],
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取异步任务" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const dispatchReq = {
  type: "object",
  properties: MobileAsyncTaskDispatchReqVO,
  required: ["clientId", "scriptId", "params"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const dispatchRes = {
  type: "object",
  properties: MobileAsyncTaskDispatchResVO,
  required: ["taskId", "status", "traceId", "expiresAtUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 创建数据库任务并发布到单台设备的隔离 Topic。
 *
 * @param input 可信脚本任务参数。
 * @param userObj 当前操作者。
 */
export async function dispatchTrustedTask(
  input: DispatchTrustedTaskParams,
  userObj: UserObj
): Promise<FromSchema<typeof dispatchRes>> {
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(input.clientId)) {
    throw new BusinessError("设备标识包含 MQTT Topic 不支持的字符");
  }
  const device = await mobileDeviceRepo.getByClientId(input.clientId);
  if (!device) throw new BusinessError(`设备不存在: ${input.clientId}`);
  if (!device.isEnabled)
    throw new BusinessError(`设备已停用: ${input.clientId}`);

  const definition = TRUSTED_SCRIPT_CATALOG[input.scriptId];
  validateTrustedScriptParams(input.scriptId, input.params);
  const timeoutMs = Math.max(
    1000,
    Math.min(
      input.timeoutMs ?? definition.defaultTimeoutMs,
      definition.maxTimeoutMs
    )
  );
  const taskId = crypto.randomUUID();
  const traceId = crypto.randomUUID();
  const createdAt = Date.now();
  const expiresAtUtc = createdAt + timeoutMs;
  const paramsJson = JSON.stringify(input.params);
  if (new TextEncoder().encode(paramsJson).byteLength > 65_536) {
    throw new BusinessError("任务参数不能超过 65536 字节");
  }
  const rawCallbackUrl = input.callbackUrl ?? getEnv("AUTOJS6_CALLBACK_URL");
  let callbackUrl: string | undefined;
  if (rawCallbackUrl) {
    const parsedCallbackUrl = new URL(rawCallbackUrl);
    if (
      parsedCallbackUrl.protocol !== "https:" &&
      parsedCallbackUrl.protocol !== "http:"
    ) {
      throw new BusinessError("任务回调地址仅支持 HTTP/HTTPS");
    }
    callbackUrl = parsedCallbackUrl.toString();
  }

  await mobileAsyncTaskRepo.add({
    taskId,
    clientId: input.clientId,
    cat: "autojs6-v2",
    script: input.scriptId,
    protocolVersion: AUTOJS6_PROTOCOL_VERSION,
    scriptId: input.scriptId,
    scriptVersion: definition.version,
    paramsJson,
    timeoutMs,
    traceId,
    status: "PENDING",
    resultMessage: null,
    resultCode: null,
    resultDataJson: null,
    startedAtUtc: null,
    finishedAtUtc: null,
    expiresAtUtc,
    remark: input.remark ?? null,
    creatorId: userObj.id,
  });

  const topic = `autojs6/v2/devices/${input.clientId}/tasks`;
  try {
    await mqttService.publish.service(
      {
        topic,
        payload: JSON.stringify({
          protocolVersion: AUTOJS6_PROTOCOL_VERSION,
          taskId,
          deviceId: input.clientId,
          scriptId: input.scriptId,
          scriptVersion: definition.version,
          params: input.params,
          timeoutMs,
          createdAt,
          expiresAt: expiresAtUtc,
          traceId,
          ...(callbackUrl ? { callbackUrl } : {}),
        }),
        qos: 1,
        retain: false,
        remark: `AutoJS6 v2 ${input.scriptId}`,
      },
      userObj
    );
  } catch (error) {
    await mobileAsyncTaskRepo.completeByTaskId(taskId, input.clientId, {
      status: "FAILURE",
      resultCode: "MQTT_PUBLISH_FAILED",
      resultMessage: error instanceof Error ? error.message : String(error),
      resultDataJson: null,
      startedAtUtc: null,
      finishedAtUtc: Date.now(),
      updaterId: userObj.id,
    });
    throw error;
  }

  return { taskId, status: "PENDING", traceId, expiresAtUtc };
}

/** 通用可信脚本任务下发 API。 */
async function onDispatch(
  params: FromSchema<typeof dispatchReq>,
  userObj: UserObj,
  context: Context
): Promise<FromSchema<typeof dispatchRes>> {
  return dispatchTrustedTask(
    {
      clientId: params.clientId,
      scriptId: params.scriptId as TrustedScriptId,
      params: params.params,
      timeoutMs: params.timeoutMs,
      remark: params.remark,
      callbackUrl: buildTaskCallbackUrl(context.req.url),
    },
    userObj
  );
}

const dispatchApi = {
  req: dispatchReq,
  res: dispatchRes,
  pathInfo: {
    path: "/dispatch",
    method: "post",
    summary: "向指定设备下发可信 AutoJS6 脚本任务",
  },
  adapter: bodyUserContextAdapter,
  service: onDispatch,
  permission: { action: "dispatch" },
} satisfies API;

const getReq = {
  type: "object",
  properties: { taskId: MobileAsyncTaskVO.taskId },
  required: ["taskId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: MobileAsyncTaskVO,
  required: [...MobileAsyncTaskDetailKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 按任务标识查询执行状态与结构化结果。 */
async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const task = await mobileAsyncTaskRepo.getByTaskId(params.taskId);
  if (!task) throw new BusinessError("任务不存在");
  return task as unknown as FromSchema<typeof getRes>;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: { path: "/get", method: "post", summary: "查询异步任务详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

/**
 * 幂等保存一条设备任务终态结果。
 *
 * @returns 是否首次写入终态。
 */
export async function handleDeviceTaskResult(
  result: DeviceTaskResultPayload
): Promise<boolean> {
  if (result.protocolVersion !== AUTOJS6_PROTOCOL_VERSION) return false;
  const task = await mobileAsyncTaskRepo.getByTaskId(result.taskId);
  if (
    !task ||
    task.protocolVersion !== AUTOJS6_PROTOCOL_VERSION ||
    task.clientId !== result.deviceId ||
    task.scriptId !== result.scriptId ||
    task.traceId !== result.traceId
  ) {
    return false;
  }

  return mobileAsyncTaskRepo.completeByTaskId(result.taskId, result.deviceId, {
    status: result.status,
    resultCode: result.code,
    resultMessage: result.message || null,
    resultDataJson: JSON.stringify(result.data ?? null),
    startedAtUtc: Number.isFinite(result.startedAt) ? result.startedAt : null,
    finishedAtUtc: Number.isFinite(result.finishedAt)
      ? result.finishedAt
      : Date.now(),
    updaterId: 0,
  });
}

/**
 * 执行领域后处理并幂等保存设备结果，供 Node MQTT 与 Worker HTTP 共用。
 */
export async function processIncomingDeviceTaskResult(
  result: DeviceTaskResultPayload
): Promise<boolean> {
  const task = await mobileAsyncTaskRepo.getByTaskId(result.taskId);
  if (
    !task ||
    task.protocolVersion !== AUTOJS6_PROTOCOL_VERSION ||
    task.clientId !== result.deviceId ||
    task.scriptId !== result.scriptId ||
    task.traceId !== result.traceId ||
    (task.status !== "PENDING" && task.status !== "RUNNING")
  ) {
    return false;
  }
  let resultToPersist = result;
  const encodedResult = new TextEncoder().encode(JSON.stringify(result));
  if (encodedResult.byteLength > 1_048_576) {
    resultToPersist = {
      ...result,
      status: "FAILURE",
      code: "RESULT_TOO_LARGE",
      message: "设备任务结果超过 1048576 字节",
      data: null,
    };
  } else {
    try {
      const { handleDeviceAppTaskResult } =
        await import("../device-app/service.js");
      await handleDeviceAppTaskResult(result);
    } catch (error) {
      resultToPersist = {
        ...result,
        status: "FAILURE",
        code: "SERVER_RESULT_PROCESSING_FAILED",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return handleDeviceTaskResult(resultToPersist);
}

const callbackReq = {
  type: "object",
  properties: MobileAsyncTaskCallbackReqVO,
  required: [
    "protocolVersion",
    "taskId",
    "deviceId",
    "scriptId",
    "status",
    "code",
    "message",
    "data",
    "startedAt",
    "finishedAt",
    "durationMs",
    "traceId",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 接收手机端 v2 HTTP 结果，供 Worker 和 Node 无 MQTT 回调场景使用。 */
async function onCallback(
  params: FromSchema<typeof callbackReq>
): Promise<boolean> {
  return processIncomingDeviceTaskResult(
    params as unknown as DeviceTaskResultPayload
  );
}

const callbackApi = {
  req: callbackReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/callback",
    method: "post",
    summary: "接收 AutoJS6 v2 设备任务结果",
  },
  adapter: bodyAdapter,
  service: onCallback,
  permission: false,
} satisfies API;

/** 将已超过服务端等待时间的任务统一置为超时。 */
export async function timeoutExpiredDeviceTasks(): Promise<number> {
  return mobileAsyncTaskRepo.timeoutPendingTasks();
}

export default {
  list: listApi,
  dispatch: dispatchApi,
  get: getApi,
  callback: callbackApi,
};
