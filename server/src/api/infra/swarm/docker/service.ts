import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { API } from "@/middleware/encapsulation";
import { bodyAdapter } from "@/middleware/encapsulation/adapter";
import { dockerClient } from "./client";
import {
  ServiceFields,
  ResponseFields,
  logsReq,
  logsRes,
  statsReq,
  statsRes,
} from "./model";

/**
 * 1. 列出所有服务
 */
const listReq = {
  type: "object",
  properties: {
    filters: ServiceFields.filters,
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  type: "array",
  items: {
    type: "object",
  },
  description: "Docker Service 列表",
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { filters } = params;
  return await dockerClient.listServices(filters);
}

const listServices = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "列出 Docker Swarm 所有服务",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

/**
 * 2. 获取单个服务详情
 */
const inspectReq = {
  type: "object",
  properties: {
    id: ServiceFields.id,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const inspectRes = {
  type: "object",
  description: "Docker Service 详细配置及运行状态",
} as const satisfies JSONSchema;

async function onInspect(
  params: FromSchema<typeof inspectReq>
): Promise<FromSchema<typeof inspectRes>> {
  const { id } = params;
  return await dockerClient.inspectService(id);
}

const inspectService = {
  req: inspectReq,
  res: inspectRes,
  pathInfo: {
    path: "/inspect",
    method: "post",
    summary: "查看单个 Swarm 服务详情",
  } as const,
  adapter: bodyAdapter,
  service: onInspect,
  permission: { action: "read" },
} satisfies API;

/**
 * 3. 创建服务
 */
const createReq = {
  type: "object",
  properties: {
    spec: ServiceFields.spec,
  },
  required: ["spec"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const createRes = {
  type: "object",
  properties: {
    ID: { type: "string", description: "新建服务的 ID" },
  },
  required: ["ID"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onCreate(
  params: FromSchema<typeof createReq>
): Promise<FromSchema<typeof createRes>> {
  const { spec } = params;
  return await dockerClient.createService(spec);
}

const createService = {
  req: createReq,
  res: createRes,
  pathInfo: {
    path: "/create",
    method: "post",
    summary: "创建新的 Swarm 服务",
  } as const,
  adapter: bodyAdapter,
  service: onCreate,
  permission: { action: "edit" },
} satisfies API;

/**
 * 4. 更新服务
 */
const updateReq = {
  type: "object",
  properties: {
    id: ServiceFields.id,
    spec: ServiceFields.spec,
    version: ServiceFields.version,
  },
  required: ["id", "spec", "version"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  type: "object",
  properties: {
    success: ResponseFields.success,
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>
): Promise<FromSchema<typeof updateRes>> {
  const { id, spec, version } = params;
  await dockerClient.updateService(id, spec, version);
  return { success: true };
}

const updateService = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新现有 Swarm 服务配置",
  } as const,
  adapter: bodyAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

/**
 * 5. 删除服务
 */
const removeReq = {
  type: "object",
  properties: {
    id: ServiceFields.id,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const removeRes = {
  type: "object",
  properties: {
    success: ResponseFields.success,
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onRemove(
  params: FromSchema<typeof removeReq>
): Promise<FromSchema<typeof removeRes>> {
  const { id } = params;
  await dockerClient.removeService(id);
  return { success: true };
}

const removeService = {
  req: removeReq,
  res: removeRes,
  pathInfo: {
    path: "/remove",
    method: "post",
    summary: "删除 Swarm 服务",
  } as const,
  adapter: bodyAdapter,
  service: onRemove,
  permission: { action: "delete" },
} satisfies API;

/**
 * 6. 获取服务日志
 */
async function onGetLogs(
  params: FromSchema<typeof logsReq>
): Promise<FromSchema<typeof logsRes>> {
  const { id, tail } = params;
  const logs = await dockerClient.getServiceLogs(id, tail ?? 100);
  return { logs };
}

const getServiceLogs = {
  req: logsReq,
  res: logsRes,
  pathInfo: {
    path: "/logs",
    method: "post",
    summary: "获取 Swarm 服务日志内容",
  } as const,
  adapter: bodyAdapter,
  service: onGetLogs,
  permission: { action: "read" },
} satisfies API;

/**
 * 7. 获取服务运行负载
 */
async function onGetStats(
  params: FromSchema<typeof statsReq>
): Promise<FromSchema<typeof statsRes>> {
  const { id } = params;
  return await dockerClient.getServiceStats(id);
}

const getServiceStats = {
  req: statsReq,
  res: statsRes,
  pathInfo: {
    path: "/stats",
    method: "post",
    summary: "获取 Swarm 服务下运行容器的负载实时监控指标",
  } as const,
  adapter: bodyAdapter,
  service: onGetStats,
  permission: { action: "read" },
} satisfies API;

export default {
  listServices,
  inspectService,
  createService,
  updateService,
  removeService,
  getServiceLogs,
  getServiceStats,
};
