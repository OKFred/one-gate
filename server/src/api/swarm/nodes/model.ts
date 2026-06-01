import type { JSONSchema } from "json-schema-to-ts";

export const listReq = {
  type: "object",
  properties: {
    filters: {
      type: "object",
      description: "过滤条件",
      additionalProperties: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const listRes = {
  type: "array",
  description: "Swarm Nodes 节点列表及其承载的负载状态",
  items: {
    type: "object",
    properties: {
      id: { type: "string", description: "节点 ID" },
      hostname: { type: "string", description: "主机名称" },
      role: {
        type: "string",
        enum: ["manager", "worker"],
        description: "角色",
      },
      status: {
        type: "string",
        enum: ["ready", "down", "disconnected"],
        description: "状态",
      },
      availability: {
        type: "string",
        enum: ["active", "drain", "pause"],
        description: "调度可用性",
      },
      ip: { type: "string", description: "节点 IP" },
      engineVersion: { type: "string", description: "Docker 引擎版本" },
      nanoCpus: { type: "number", description: "CPU 核心数" },
      memoryBytes: { type: "number", description: "总物理内存" },
      runningTaskCount: {
        type: "number",
        description: "在该节点运行中的 Task 数量",
      },
      allocatedCpus: { type: "number", description: "已分配 CPU (核数)" },
      allocatedMemory: { type: "number", description: "已分配内存 (字节)" },
      rawJson: { type: "string", description: "原始 JSON 数据" },
    },
    required: [
      "id",
      "hostname",
      "role",
      "status",
      "availability",
      "ip",
      "engineVersion",
      "nanoCpus",
      "memoryBytes",
      "runningTaskCount",
      "allocatedCpus",
      "allocatedMemory",
      "rawJson",
    ],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
