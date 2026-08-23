import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import type { API } from "@hodor/core/middleware/encapsulation";
import {
  bodyAdapter,
  bodyUserAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import type { Context, UserObj } from "@hodor/core/types/app";
import {
  dispatchTrustedTask,
  getDeviceTask,
  MOBILE_TASK_TERMINAL_STATUSES,
  type DeviceTaskResultPayload,
} from "../async-task/facade.js";
import { buildTaskCallbackUrl } from "../async-task/interfaces/http/callback-url.js";
import { findDeviceTaskTarget } from "../device/facade.js";
import {
  normalizeNetworkRoutingConfig,
  NetworkRoutingRuleViolation,
  type NetworkRoutingConfig,
  type NetworkRoutingTarget,
} from "./domain.js";
import { NetworkRoutingVO } from "./model.js";
import {
  networkRoutingRepository,
  type NetworkRoutingView,
} from "./repository.js";

const clientIdSchema = {
  type: "string",
  minLength: 1,
  maxLength: 100,
} as const satisfies JSONSchema;
const targetSchema = {
  type: "string",
  enum: ["default", "wifi", "carrier"],
} as const satisfies JSONSchema;
const getReq = {
  type: "object",
  properties: { clientId: clientIdSchema },
  required: ["clientId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const routingRes = {
  type: "object",
  properties: NetworkRoutingVO,
  required: Object.keys(NetworkRoutingVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const taskRes = {
  type: "object",
  properties: {
    taskId: { type: "string" },
    status: { type: "string", enum: ["PENDING"] },
    generation: { type: "integer" },
    traceId: { type: "string" },
    expiresAtUtc: { type: "integer" },
  },
  required: ["taskId", "status", "generation", "traceId", "expiresAtUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

function publicView(value: NetworkRoutingView) {
  const { creatorId: _creatorId, updaterId: _updaterId, ...result } = value;
  return result;
}

async function requireDevice(clientId: string): Promise<void> {
  const device = await findDeviceTaskTarget(clientId);
  if (!device) throw new BusinessError(`设备不存在: ${clientId}`);
  if (!device.isEnabled) throw new BusinessError(`设备已停用: ${clientId}`);
}

async function getOrCreate(
  clientId: string,
  actorId: number
): Promise<NetworkRoutingView> {
  await requireDevice(clientId);
  return reconcile(
    await networkRoutingRepository.getOrCreate(clientId, actorId)
  );
}

/** 将服务端已终结但设备结果后处理未完成的任务恢复到分流状态机。 */
async function reconcile(
  view: NetworkRoutingView
): Promise<NetworkRoutingView> {
  if (view.state !== "APPLYING" || !view.lastTaskId) return view;
  const task = await getDeviceTask(view.lastTaskId);
  if (
    !task ||
    !MOBILE_TASK_TERMINAL_STATUSES.includes(
      task.status as DeviceTaskResultPayload["status"]
    )
  )
    return view;
  let data: unknown = null;
  try {
    data = task.resultDataJson ? JSON.parse(task.resultDataJson) : null;
  } catch {
    data = null;
  }
  const resultData =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>), generation: view.generation }
      : { generation: view.generation };
  await networkRoutingRepository.complete({
    protocolVersion: 2,
    taskId: task.taskId,
    deviceId: task.clientId,
    scriptId: task.scriptId || "",
    status: task.status as DeviceTaskResultPayload["status"],
    code: task.resultCode || "SERVER_TASK_TERMINATED",
    message: task.resultMessage || "Network routing task terminated",
    data: resultData,
    startedAt: task.startedAtUtc || task.createTimeUtc,
    finishedAt: task.finishedAtUtc || Date.now(),
    durationMs: Math.max(
      0,
      (task.finishedAtUtc || Date.now()) -
        (task.startedAtUtc || task.createTimeUtc)
    ),
    traceId: task.traceId || "server-reconciled",
  });
  return (await networkRoutingRepository.get(view.clientId)) || view;
}

const getApi = {
  req: getReq,
  res: routingRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取设备网络分流配置和状态",
  },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof getReq>) =>
    publicView(await getOrCreate(params.clientId, 0)) as FromSchema<
      typeof routingRes
    >,
  permission: { action: "read" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    clientId: clientIdSchema,
    lanCidrs: NetworkRoutingVO.lanCidrs,
    lanProbeUrls: NetworkRoutingVO.lanProbeUrls,
    internetProbeUrl: NetworkRoutingVO.internetProbeUrl,
    probeTimeoutMs: NetworkRoutingVO.probeTimeoutMs,
  },
  required: [
    "clientId",
    "lanCidrs",
    "lanProbeUrls",
    "internetProbeUrl",
    "probeTimeoutMs",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateApi = {
  req: updateReq,
  res: routingRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新设备网络分流配置并生成新修订",
  },
  adapter: bodyUserAdapter,
  service: async (params: FromSchema<typeof updateReq>, user: UserObj) => {
    await getOrCreate(params.clientId, user.id);
    let config: NetworkRoutingConfig;
    try {
      config = normalizeNetworkRoutingConfig({
        lanCidrs: [...params.lanCidrs],
        lanProbeUrls: [...params.lanProbeUrls],
        internetProbeUrl: params.internetProbeUrl,
        probeTimeoutMs: params.probeTimeoutMs,
      });
    } catch (error) {
      if (error instanceof NetworkRoutingRuleViolation)
        throw new BusinessError(error.message);
      throw error;
    }
    const updated = await networkRoutingRepository.updateConfig(
      params.clientId,
      config,
      user.id
    );
    if (!updated)
      throw new BusinessError("设备存在未终结的网络分流任务，暂不能修改配置");
    return publicView(updated) as FromSchema<typeof routingRes>;
  },
  permission: { action: "edit" },
} satisfies API;

const applyReq = {
  type: "object",
  properties: { clientId: clientIdSchema, internetTarget: targetSchema },
  required: ["clientId", "internetTarget"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function dispatchAction(input: {
  clientId: string;
  target: NetworkRoutingTarget | null;
  actor: UserObj;
  context: Context;
}): Promise<FromSchema<typeof taskRes>> {
  await getOrCreate(input.clientId, input.actor.id);
  const reserved = await networkRoutingRepository.beginAction(
    input.clientId,
    input.target,
    input.actor.id
  );
  if (!reserved) throw new BusinessError("同一设备已有未终结的网络分流任务");
  const scriptId = input.target
    ? "device.network.routing.apply"
    : "device.network.routing.disable";
  const params = input.target
    ? {
        generation: reserved.generation,
        policyRevision: reserved.policyRevision,
        internetTarget: input.target,
        lanCidrs: reserved.lanCidrs,
        lanProbeUrls: reserved.lanProbeUrls,
        internetProbeUrl: reserved.internetProbeUrl,
        probeTimeoutMs: reserved.probeTimeoutMs,
      }
    : { generation: reserved.generation };
  try {
    const task = await dispatchTrustedTask(
      {
        clientId: input.clientId,
        scriptId,
        params,
        timeoutMs: input.target ? 180_000 : 90_000,
        priority: "HIGH",
        preemptRunning: false,
        remark: input.target
          ? `应用网络分流: ${input.target}`
          : "停用网络分流并恢复 Android 默认路由",
        callbackUrl: buildTaskCallbackUrl(input.context.req.url),
      },
      input.actor
    );
    await networkRoutingRepository.attachTask(
      input.clientId,
      reserved.generation,
      task.taskId
    );
    return { ...task, generation: reserved.generation };
  } catch (error) {
    await networkRoutingRepository.failDispatch(
      input.clientId,
      reserved.generation,
      "ROUTING_DISPATCH_FAILED"
    );
    throw error;
  }
}

const applyApi = {
  req: applyReq,
  res: taskRes,
  pathInfo: { path: "/apply", method: "post", summary: "异步应用设备网络分流" },
  adapter: bodyUserContextAdapter,
  service: (
    params: FromSchema<typeof applyReq>,
    user: UserObj,
    context: Context
  ) =>
    dispatchAction({
      clientId: params.clientId,
      target: params.internetTarget as NetworkRoutingTarget,
      actor: user,
      context,
    }),
  permission: { action: "edit" },
} satisfies API;

const disableApi = {
  req: getReq,
  res: taskRes,
  pathInfo: {
    path: "/disable",
    method: "post",
    summary: "异步停用设备网络分流",
  },
  adapter: bodyUserContextAdapter,
  service: (
    params: FromSchema<typeof getReq>,
    user: UserObj,
    context: Context
  ) =>
    dispatchAction({
      clientId: params.clientId,
      target: null,
      actor: user,
      context,
    }),
  permission: { action: "edit" },
} satisfies API;

/** 将手机客户端分流终态映射到每设备实际状态。 */
export async function handleNetworkRoutingTaskResult(
  result: DeviceTaskResultPayload
): Promise<void> {
  await networkRoutingRepository.complete(result);
}

export default {
  get: getApi,
  update: updateApi,
  apply: applyApi,
  disable: disableApi,
};
