import type { JSONSchema } from "json-schema-to-ts";

export const ServiceFields = {
  id: {
    type: "string",
    description: "服务 ID 或服务名称",
    examples: ["u8p2jh82h2x9", "my-service"],
    minLength: 1,
    maxLength: 100,
  },
  version: {
    type: "number",
    description:
      "服务的当前配置版本号（即 Spec 的 Version.Index），用于更新校验",
    examples: [12],
  },
  filters: {
    type: "object",
    description: "过滤条件，如 { name: ['my-service'] }",
    additionalProperties: {
      type: "array",
      items: {
        type: "string",
      },
    },
    examples: [{ name: ["my-service"] }],
  },
  spec: {
    type: "object",
    description: "Docker Swarm Service 配置对象 (ServiceSpec)",
    properties: {
      Name: {
        type: "string",
        description: "服务名称",
        examples: ["my-service"],
      },
      Labels: {
        type: "object",
        description: "服务标签对",
        additionalProperties: { type: "string" },
      },
      TaskTemplate: {
        type: "object",
        description: "任务模板，定义容器的规格和调度属性",
        properties: {
          ContainerSpec: {
            type: "object",
            properties: {
              Image: {
                type: "string",
                description: "容器镜像",
                examples: ["nginx:latest"],
              },
              Env: {
                type: "array",
                items: { type: "string" },
                description: "环境变量列表",
              },
              Command: {
                type: "array",
                items: { type: "string" },
              },
              Args: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["Image"],
          },
        },
        required: ["ContainerSpec"],
      },
      Mode: {
        type: "object",
        properties: {
          Replicated: {
            type: "object",
            properties: {
              Replicas: {
                type: "number",
                description: "服务副本数",
                examples: [3],
              },
            },
          },
          Global: {
            type: "object",
          },
        },
      },
      UpdateConfig: {
        type: "object",
      },
      RollbackConfig: {
        type: "object",
      },
      EndpointSpec: {
        type: "object",
        properties: {
          Ports: {
            type: "array",
            items: {
              type: "object",
              properties: {
                Protocol: { type: "string", enum: ["tcp", "udp"] },
                PublishMode: { type: "string" },
                PublishedPort: { type: "number" },
                TargetPort: { type: "number" },
              },
              required: ["PublishedPort", "TargetPort"],
            },
          },
        },
      },
    },
    required: ["Name", "TaskTemplate"],
  },
} as const satisfies Record<string, JSONSchema>;

export const ResponseFields = {
  success: {
    type: "boolean",
    description: "操作是否成功",
    examples: [true],
  },
} as const satisfies Record<string, JSONSchema>;

export const logsReq = {
  type: "object",
  properties: {
    id: ServiceFields.id,
    tail: {
      type: "number",
      description: "返回的日志行数",
      minimum: 1,
      maximum: 5000,
      default: 100,
    },
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const logsRes = {
  type: "object",
  properties: {
    logs: {
      type: "string",
      description: "服务日志文本内容",
    },
  },
  required: ["logs"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const statsReq = {
  type: "object",
  properties: {
    id: ServiceFields.id,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const statsRes = {
  type: "array",
  description: "Swarm 服务各运行中 Task 副本负载指标",
  items: {
    type: "object",
    properties: {
      taskId: { type: "string" },
      containerId: { type: "string" },
      nodeId: { type: "string" },
      cpuPercent: { type: "number" },
      memoryUsage: { type: "number" },
      memoryLimit: { type: "number" },
      memoryPercent: { type: "number" },
      networkRx: { type: "number" },
      networkTx: { type: "number" },
      blkRead: { type: "number" },
      blkWrite: { type: "number" },
    },
    required: [
      "taskId",
      "containerId",
      "nodeId",
      "cpuPercent",
      "memoryUsage",
      "memoryLimit",
      "memoryPercent",
      "networkRx",
      "networkTx",
      "blkRead",
      "blkWrite",
    ],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
