import mqtt from "mqtt";
import type { FromSchema } from "json-schema-to-ts";
import {
  bodyAdapter,
  queryAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import baseLogService from "../base/log/service.js";
import * as baseSysConfigRepository from "../base/sys_config/repository.js";
import {
  MqttPublishReqSchema,
  MqttPublishResSchema,
  MqttLogQueryReqSchema,
  MqttLogListResSchema,
  MqttCredentialsReqSchema,
  MqttCredentialsResSchema,
  MqttTestConnectionReqSchema,
  MqttTestConnectionResSchema,
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

  let rawConfig: unknown = {};
  if (primaryConfig && primaryConfig.configValue) {
    rawConfig = primaryConfig.configValue;
  } else {
    // 降级使用第一个存在的配置，或者默认 EMQX 配置
    const configs = await baseSysConfigRepository.findByNamespace("mqtt");
    if (configs.length > 0 && configs[0].configValue) {
      rawConfig = configs[0].configValue;
    }
  }

  // 依赖 driver 计算 EMQX 直接凭证或 阿里云 HmacSHA1 动态签名凭证
  return getMqttConnectionInfo(rawConfig);
}

/**
 * 建立高可用 MQTT 连接（支持在 Worker 环境自动回退 WSS 协议）
 */
async function connectMqttWithFallback(
  credentials: MqttConnectionCredentials,
  opts: { connectTimeout?: number; timeoutMs?: number; clientIdPrefix?: string }
): Promise<mqtt.MqttClient> {
  const { connectTimeout = 4000, timeoutMs = 5000, clientIdPrefix = "" } = opts;
  const clientId = `${credentials.clientId}_${clientIdPrefix}${Date.now().toString(36)}`;

  const urlsToTry: string[] = [];
  if (
    credentials.brokerUrl.startsWith("mqtts://") ||
    credentials.brokerUrl.startsWith("mqtt://")
  ) {
    try {
      const parsed = new URL(
        credentials.brokerUrl
          .replace("mqtts://", "https://")
          .replace("mqtt://", "http://")
      );
      // 在 Worker/Edge 环境下优先尝试 WSS (8084 / 443)，最后回退到原生 TCP mqtts (8883)
      urlsToTry.push(
        `wss://${parsed.hostname}:8084/mqtt`,
        `wss://${parsed.hostname}:443/mqtt`,
        credentials.brokerUrl
      );
    } catch {
      urlsToTry.push(credentials.brokerUrl);
    }
  } else {
    urlsToTry.push(credentials.brokerUrl);
  }

  let lastError: unknown;
  for (const brokerUrl of urlsToTry) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`MQTT 连接超时(${timeoutMs / 1000}s)`)),
          timeoutMs
        );
      });

      const client = await Promise.race([
        mqtt.connectAsync(brokerUrl, {
          clientId,
          username: credentials.username || undefined,
          password: credentials.password || undefined,
          keepalive: credentials.keepalive,
          clean: credentials.cleanSession,
          connectTimeout,
          reconnectPeriod: 0,
          rejectUnauthorized: false,
        }),
        timeoutPromise,
      ]);

      if (timer) clearTimeout(timer);
      if (client) {
        return client;
      }
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastError = err;
    }
  }

  throw lastError || new Error("MQTT 连接失败");
}

/**
 * 执行 MQTT 消息发布服务
 *
 * @param params 包含 topic, payload, qos, retain 的发布参数
 * @param userObj 当前登录用户信息
 * @returns 包含 traceId 的结果
 */
async function onPublish(
  params: FromSchema<typeof MqttPublishReqSchema>,
  userObj?: UserObj
) {
  const qos = (params.qos ?? 0) as 0 | 1 | 2;
  const retain = params.retain ?? false;
  const traceId = `mqtt_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

  // 获取计算好的多提供商 (EMQX / Aliyun) 动态签名凭证
  const credentials = await getActiveCredentials();

  let publishSuccess = false;
  let errorMsg = "";
  let client: mqtt.MqttClient | null = null;

  try {
    client = await connectMqttWithFallback(credentials, {
      connectTimeout: 7000,
      timeoutMs: 8000,
      clientIdPrefix: "pub_",
    });

    await client.publishAsync(params.topic, params.payload, {
      qos,
      retain,
    });
    publishSuccess = true;
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
  } finally {
    if (client) {
      try {
        (client as mqtt.MqttClient).end(true);
      } catch {}
    }
  }

  // 记录审计与业务日志
  try {
    await baseLogService.biz.add({
      namespace: "mqtt",
      status: publishSuccess,
      payloadType: "json",
      remark: publishSuccess
        ? `MQTT 消息发布成功: ${params.topic}`
        : `MQTT 消息发布失败: ${errorMsg}`,
      creatorId: userObj?.userId || 0,
      creatorName: userObj?.username || "System",
      logValue: {
        traceId,
        topic: params.topic,
        payload: params.payload,
        qos,
        retain,
        direction: "OUT",
        remark: params.remark ?? null,
        error: publishSuccess ? null : errorMsg,
      },
    });
  } catch (logErr) {
    console.error("[MQTT Publish] Failed to record log:", logErr);
  }

  if (!publishSuccess) {
    throw new BusinessError(`消息发布失败: ${errorMsg}`);
  }

  return {
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
 * 执行 MQTT 连通性测试服务
 *
 * @param params MQTT 配置选项
 * @returns 包含成功状态与提示信息的结果
 */
async function onTestConnection(
  params: FromSchema<typeof MqttTestConnectionReqSchema>
) {
  let credentials: MqttConnectionCredentials;
  if (params.host) {
    credentials = getMqttConnectionInfo(params);
  } else if (params.id) {
    const sysCfg = await baseSysConfigRepository.findById(params.id as number);
    if (!sysCfg || !sysCfg.configValue) {
      throw new BusinessError("未找到指定的 MQTT 配置");
    }
    credentials = getMqttConnectionInfo(sysCfg.configValue);
  } else {
    credentials = await getActiveCredentials();
  }

  let client: mqtt.MqttClient | null = null;
  try {
    client = await connectMqttWithFallback(credentials, {
      connectTimeout: 7000,
      timeoutMs: 8000,
      clientIdPrefix: "test_",
    });

    return {
      success: true,
      message: `已成功连通 [${credentials.provider}] Broker (${credentials.brokerUrl})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new BusinessError(`MQTT 连通性测试失败: ${errorMsg}`);
  } finally {
    if (client) {
      try {
        (client as mqtt.MqttClient).end(true);
      } catch {}
    }
  }
}

/**
 * MQTT 连通性测试 API
 */
export const testConnectionApi = {
  req: MqttTestConnectionReqSchema,
  res: MqttTestConnectionResSchema,
  pathInfo: {
    path: "/testConnection",
    method: "post",
    summary: "测试 MQTT 连通性",
  },
  adapter: bodyAdapter,
  service: onTestConnection,
  permission: { action: "read" },
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
  req: MqttCredentialsReqSchema,
  res: MqttCredentialsResSchema,
  pathInfo: {
    path: "/credentials",
    method: "post",
    summary: "获取 MQTT 计算后的动态签名与连接凭证",
  },
  adapter: bodyAdapter,
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

  const filters: Record<string, unknown> = {};
  if (params.direction) {
    filters.direction = params.direction;
  }

  const likeFilters: Record<string, string> = {};
  if (params.topic) {
    likeFilters.topic = params.topic;
  }

  const result = await baseLogService.biz.list({
    namespace: "mqtt",
    pageNo,
    pageSize,
    descend: true,
    startTime: params.startTimeUtc || undefined,
    endTime: params.endTimeUtc || undefined,
    status: params.status ?? undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    likeFilters: Object.keys(likeFilters).length > 0 ? likeFilters : undefined,
  });

  return {
    list: result.list as MqttBizLogItem[],
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
  testConnection: testConnectionApi,
  credentials: getCredentialsApi,
  logs: listLogsApi,
};

export default service;
