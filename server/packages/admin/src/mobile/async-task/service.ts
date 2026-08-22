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
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { verifyDeviceReportToken } from "../device/facade.js";
import { adaptDeviceHttpError } from "../device/interfaces/http/error.js";
import {
  MobileAsyncTaskVO,
  MobileAsyncTaskListKeys,
  MobileAsyncTaskDetailKeys,
  MobileAsyncTaskSortableKeys,
  MobileAsyncTaskDispatchReqVO,
  MobileAsyncTaskDispatchResVO,
  MobileAsyncTaskCallbackReqVO,
  type MobileTaskPriority,
} from "./model.js";
import {
  dispatchTrustedTask,
  getDeviceTask,
  listDeviceTasks,
  processIncomingDeviceTaskResult,
  type DeviceTaskResultPayload,
  type TrustedScriptId,
} from "./facade.js";
import { buildTaskCallbackUrl } from "./interfaces/http/callback-url.js";
import { adaptDeviceTaskHttpError } from "./interfaces/http/error.js";
import { networkRoutingRepository } from "../network-routing/repository.js";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    clientId: MobileAsyncTaskVO.clientId,
    status: MobileAsyncTaskVO.status,
    priority: MobileAsyncTaskVO.priority,
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
  const result = await listDeviceTasks({
    keyword: params.keyword,
    clientId: params.clientId,
    status: params.status,
    priority: params.priority,
    orderBy: params.orderBy,
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });
  return {
    ...result,
    list: result.list as unknown as FromSchema<typeof listRes>["list"],
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

/** 将 HTTP 请求适配为可信设备任务下发用例。 */
async function onDispatch(
  params: FromSchema<typeof dispatchReq>,
  userObj: UserObj,
  context: Context
): Promise<FromSchema<typeof dispatchRes>> {
  if (String(params.scriptId).startsWith("device.network.routing.")) {
    throw new BusinessError(
      "网络分流指令必须通过专用 network-routing 控制面下发"
    );
  }
  if (
    params.scriptId === "device.network.switch" &&
    (await networkRoutingRepository.isPersistentRoutingActive(params.clientId))
  ) {
    throw new BusinessError("NETWORK_ROUTING_ACTIVE: 请先停用持久网络分流");
  }
  return adaptDeviceTaskHttpError(() =>
    dispatchTrustedTask(
      {
        clientId: params.clientId,
        scriptId: params.scriptId as TrustedScriptId,
        params: params.params,
        timeoutMs: params.timeoutMs,
        priority: params.priority as MobileTaskPriority | undefined,
        preemptRunning: params.preemptRunning,
        remark: params.remark,
        callbackUrl: buildTaskCallbackUrl(context.req.url),
      },
      userObj
    )
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
  const task = await getDeviceTask(params.taskId);
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
const callbackApi = {
  req: callbackReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/callback",
    method: "post",
    summary: "接收 AutoJS6 v2 设备任务结果",
  },
  adapter: rawAdapter,
  service: async (context: Context): Promise<boolean> => {
    const result = context.get("bodyObj") as DeviceTaskResultPayload;
    const token = context.req.header("x-device-token");
    if (!token) throw new BusinessError("缺少设备上报令牌");
    await adaptDeviceHttpError(() =>
      verifyDeviceReportToken(result.deviceId, token)
    );
    return processIncomingDeviceTaskResult(result);
  },
  permission: false,
} satisfies API;

export default {
  list: listApi,
  dispatch: dispatchApi,
  get: getApi,
  callback: callbackApi,
};
