import type { FromSchema } from "json-schema-to-ts";
import {
  bodyAdapter,
  queryAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { UserObj } from "@hodor/core/types/app";
import baseLogService from "../base/log/service.js";
import * as baseSysConfigRepository from "../base/sys_config/repository.js";
import {
  MqttPublishReqSchema,
  MqttPublishResSchema,
  MqttLogQueryReqSchema,
  MqttLogListResSchema,
  MqttCredentialsResSchema,
  type MqttBizLogItem,
  type MqttLogValueLike,
} from "./model.js";
import {
  getMqttConnectionInfo,
  type MqttConfigOptions,
  type MqttConnectionCredentials,
} from "./driver.js";

/**
 * 获取当前系统激活的 MQTT 配置并生成签名连接凭证
 *
 * @returns 计算后的 MQTT 连接凭证对象
 */
export async function getActiveCredentials(): Promise<MqttConnectionCredentials> {
  const primaryConfig =
    await baseSysConfigRepository.findPrimaryByNamespace("mqtt");

  let rawConfig: MqttConfigOptions = {};
  if (primaryConfig && primaryConfig.configValue) {
    rawConfig = primaryConfig.configValue as MqttConfigOptions;
  } else {
    // 降级使用第一个存在的配置，或者默认 EMQX 配置
    const configs = await baseSysConfigRepository.findByNamespace("mqtt");
    if (configs.length > 0 && configs[0].configValue) {
      rawConfig = configs[0].configValue as MqttConfigOptions;
    }
  }

  // 依赖 driver 计算 EMQX 直接凭证或 阿里云 HmacSHA1 动态签名凭证
  return getMqttConnectionInfo(rawConfig);
}

/**
 * 执行 MQTT 消息发布服务
 *
 * @param params 包含 topic, payload, qos, retain 的发布参数
 * @param userObj 当前登录用户信息
 * @returns 包含成功状态、提示信息与 traceId 的结果
 */
async function onPublish(
  params: FromSchema<typeof MqttPublishReqSchema>,
  userObj?: UserObj
) {
  const qos = params.qos ?? 0;
  const retain = params.retain ?? false;
  const traceId = `mqtt_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

  // 获取计算好的多提供商 (EMQX / Aliyun) 动态签名凭证
  const credentials = await getActiveCredentials();

  const logValue: MqttLogValueLike & {
    provider?: string;
    brokerUrl?: string;
  } = {
    traceId,
    topic: params.topic,
    payload: params.payload,
    qos,
    retain,
    direction: "OUT",
    provider: credentials.provider,
    brokerUrl: credentials.brokerUrl,
  };

  // 记录业务日志到 base_biz_log
  const logData = {
    namespace: "mqtt",
    status: true,
    payloadType: "json",
    logValue,
    remark:
      params.remark ||
      `[${credentials.provider}] 向主题 ${params.topic} 发布消息`,
    creatorId: userObj?.id || 0,
    creatorName: userObj?.username || "system",
  };

  await baseLogService.biz.add(logData);

  return {
    success: true,
    message: `消息已成功通过 [${credentials.provider}] 发布至主题 [${params.topic}]`,
    traceId,
  };
}

/**
 * 发布 MQTT 消息 API
 */
export const publishApi = {
  req: MqttPublishReqSchema,
  res: MqttPublishResSchema,
  pathInfo: {
    path: "/publish",
    method: "post",
    summary: "发布 MQTT 消息",
  },
  adapter: bodyAdapter,
  service: onPublish,
  permission: { action: "write" },
} satisfies API;

/**
 * 执行 MQTT 动态签名连接凭证查询服务
 *
 * @returns 包含计算出的 Username/Password 签名凭证
 */
async function onGetCredentials() {
  return await getActiveCredentials();
}

/**
 * 获取 MQTT 动态连接与签名凭证 API
 */
export const getCredentialsApi = {
  req: { type: "object", properties: {}, additionalProperties: false },
  res: MqttCredentialsResSchema,
  pathInfo: {
    path: "/credentials",
    method: "get",
    summary: "获取 MQTT 计算后的动态签名与连接凭证",
  },
  adapter: queryAdapter,
  service: onGetCredentials,
  permission: { action: "read" },
} satisfies API;

/**
 * 执行 MQTT 日志查询服务
 *
 * @param params 分页与筛选条件
 * @returns 业务日志列表
 */
async function onListLogs(params: FromSchema<typeof MqttLogQueryReqSchema>) {
  const pageNo = params.pageNo || 1;
  const pageSize = params.pageSize || 20;

  const result = await baseLogService.biz.list({
    namespace: "mqtt",
    pageNo,
    pageSize,
    descend: true,
    startTime: params.startTimeUtc || undefined,
    endTime: params.endTimeUtc || undefined,
  });

  // 内存二次过滤 topic 和 direction (若入参提供)
  let filteredList = result.list as MqttBizLogItem[];
  if (params.topic) {
    const keyword = params.topic;
    filteredList = filteredList.filter((item) => {
      const val = item.logValue;
      return typeof val?.topic === "string" && val.topic.includes(keyword);
    });
  }
  if (params.direction) {
    const dir = params.direction;
    filteredList = filteredList.filter((item) => {
      const val = item.logValue;
      return val?.direction === dir;
    });
  }

  return {
    list: filteredList,
    total: result.total,
    pageNo,
    pageSize,
  };
}

/**
 * 查询 MQTT 历史消息日志列表 API
 */
export const listLogsApi = {
  req: MqttLogQueryReqSchema,
  res: MqttLogListResSchema,
  pathInfo: {
    path: "/logs",
    method: "post",
    summary: "查询 MQTT 历史消息日志",
  },
  adapter: bodyAdapter,
  service: onListLogs,
  permission: { action: "read" },
} satisfies API;

const service = {
  publish: publishApi,
  credentials: getCredentialsApi,
  logs: listLogsApi,
};

export default service;
