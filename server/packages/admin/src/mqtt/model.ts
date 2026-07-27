import type { JSONSchema } from "json-schema-to-ts";
import type { BizLogPOLike } from "../base/log/model.js";

/**
 * MQTT 日志 logValue 明细结构
 */
export interface MqttLogValueLike {
  traceId?: string;
  topic?: string;
  payload?: unknown;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  direction?: "IN" | "OUT";
}

/**
 * MQTT 业务日志实体记录类型
 */
export type MqttBizLogItem = Omit<BizLogPOLike, "logValue"> & {
  logValue: MqttLogValueLike;
};

/**
 * MQTT 消息发布请求属性定义
 */
export const MqttPublishVO = {
  topic: {
    type: "string",
    description: "目标 Topic 主题",
    minLength: 1,
  },
  payload: {
    type: "string",
    description: "消息载荷 (支持 JSON 字符串或纯文本)",
  },
  qos: {
    type: "number",
    enum: [0, 1, 2],
    description: "服务质量等级 QoS (0, 1, 2)",
    default: 0,
  },
  retain: {
    type: "boolean",
    description: "是否为保留消息 Retain",
    default: false,
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
  },
} as const satisfies Record<string, JSONSchema>;

export const MqttPublishKeys = ["topic", "payload"] as const;

/**
 * MQTT 消息发布响应属性定义
 */
export const MqttPublishResVO = {
  traceId: { type: "string", description: "消息追踪ID" },
} as const satisfies Record<string, JSONSchema>;

/**
 * MQTT 消息发布 API 请求定义
 */
export const MqttPublishReqSchema = {
  type: "object",
  properties: MqttPublishVO,
  required: [...MqttPublishKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * MQTT 消息发布 API 响应定义
 */
export const MqttPublishResSchema = {
  type: "object",
  properties: MqttPublishResVO,
  required: ["traceId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * MQTT 连通性测试 API 请求定义
 */
export const MqttTestConnectionReqSchema = {
  type: "object",
  properties: {
    id: { type: ["number", "null"], nullable: true },
    provider: { type: ["string", "null"], nullable: true },
    protocol: { type: ["string", "null"], nullable: true },
    host: { type: ["string", "null"], nullable: true },
    port: { type: ["number", "null"], nullable: true },
    clientId: { type: ["string", "null"], nullable: true },
    username: { type: ["string", "null"], nullable: true },
    password: { type: ["string", "null"], nullable: true },
    instanceId: { type: ["string", "null"], nullable: true },
    accessKey: { type: ["string", "null"], nullable: true },
    secretKey: { type: ["string", "null"], nullable: true },
    productKey: { type: ["string", "null"], nullable: true },
    deviceName: { type: ["string", "null"], nullable: true },
    keepalive: { type: ["number", "null"], nullable: true },
    cleanSession: { type: ["boolean", "null"], nullable: true },
  },
  additionalProperties: true,
} as const satisfies JSONSchema;

/**
 * MQTT 连通性测试 API 响应定义
 */
export const MqttTestConnectionResSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", description: "测试连通性是否成功" },
    message: { type: "string", description: "测试结果消息" },
  },
  required: ["success", "message"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * MQTT 日志列表查询请求属性定义
 */
export const MqttLogQueryVO = {
  pageNo: { type: "number", description: "页码", default: 1 },
  pageSize: { type: "number", description: "每页数量", default: 20 },
  topic: {
    type: ["string", "null"],
    nullable: true,
    description: "主题关键字",
  },
  direction: {
    type: ["string", "null"],
    enum: ["IN", "OUT", null],
    nullable: true,
    description: "消息流向: IN (接收), OUT (发送)",
  },
  status: {
    type: ["boolean", "null"],
    nullable: true,
    description: "发送状态 (true成功, false失败)",
  },
  startTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "起始时间 UTC 时间戳",
  },
  endTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "截止时间 UTC 时间戳",
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * MQTT 日志列表响应属性定义
 */
export const MqttLogListResVO = {
  list: {
    type: "array",
    items: {
      type: "object",
      additionalProperties: true,
    },
    description: "日志记录列表",
  },
  total: { type: "number", description: "总条数" },
  pageNo: { type: "number", description: "页码" },
  pageSize: { type: "number", description: "每页数量" },
} as const satisfies Record<string, JSONSchema>;

/**
 * MQTT 日志查询 API 请求定义
 */
export const MqttLogQueryReqSchema = {
  type: "object",
  properties: MqttLogQueryVO,
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * MQTT 日志查询 API 响应定义
 */
export const MqttLogListResSchema = {
  type: "object",
  properties: MqttLogListResVO,
  required: ["list", "total", "pageNo", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * MQTT 动态连接凭证响应属性定义
 */
export const MqttCredentialsResVO = {
  provider: { type: "string", description: "提供商类型: EMQX / Aliyun" },
  brokerUrl: { type: "string", description: "Broker 服务地址" },
  clientId: { type: "string", description: "客户端 ClientId" },
  username: { type: "string", description: "计算/配置的 Username" },
  password: { type: "string", description: "计算/配置的 Password (已签名)" },
  keepalive: { type: "number", description: "心跳保持时间(秒)" },
  cleanSession: { type: "boolean", description: "Clean Session 标志" },
} as const satisfies Record<string, JSONSchema>;

/**
 * MQTT 动态连接凭证查询响应 Schema
 */
export const MqttCredentialsResSchema = {
  type: "object",
  properties: MqttCredentialsResVO,
  required: [
    "provider",
    "brokerUrl",
    "clientId",
    "username",
    "password",
    "keepalive",
    "cleanSession",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
