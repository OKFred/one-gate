import { EventEmitter } from "events";
import mqtt from "mqtt";

import {
  processIncomingDeviceTaskResult,
  timeoutExpiredDeviceTasks,
  type DeviceTaskResultPayload,
} from "../mobile/async-task/facade.js";
import {
  processIncomingDeploymentEvent,
  timeoutExpiredClientDeployments,
} from "../mobile/client-deployment/facade.js";
import { parseDeviceDeploymentEvent } from "../mobile/client-deployment/domain/deployment.js";
import {
  cleanupExpiredDeviceEvents,
  markTimedOutDevicesOffline,
  processDeviceEvent,
  processDeviceInfo,
  processDevicePresence,
  type DeviceEventInput,
  type DeviceInfoInput,
  type DevicePresenceInput,
} from "../mobile/device/service.js";
import { isRecord } from "../mobile/device/metadata.js";
import { hashDeviceToken } from "../mobile/device/crypto.js";
import { getActiveCredentials } from "./service.js";
import { getEnv } from "@hodor/core/utils/env";
import { initializeMobileTaskResultHandlers } from "../mobile/bootstrap.js";

/** 兼容旧订阅者的设备事件结构。 */
export interface DeviceEventPayload {
  clientId: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

/** 设备事件总线，供其他服务订阅非敏感事件摘要与 Presence。 */
export const deviceEventBus = new EventEmitter();

let mqttClient: mqtt.MqttClient | null = null;
let started = false;
let timeoutScanner: ReturnType<typeof setInterval> | null = null;
let retentionScanner: ReturnType<typeof setInterval> | null = null;

/** 为日志生成不可逆的短设备标签，避免记录真实设备标识。 */
async function deviceLogLabel(deviceId: string): Promise<string> {
  return (await hashDeviceToken(deviceId)).slice(0, 12);
}

/** 将未知 MQTT 载荷解析为 v2 任务结果。 */
function parseTaskResult(value: unknown): DeviceTaskResultPayload | null {
  if (!isRecord(value) || value.protocolVersion !== 2) return null;
  const requiredStrings = [
    "taskId",
    "deviceId",
    "scriptId",
    "status",
    "code",
    "message",
    "traceId",
  ] as const;
  if (requiredStrings.some((key) => typeof value[key] !== "string")) {
    return null;
  }
  const status = value.status;
  if (
    status !== "SUCCESS" &&
    status !== "FAILURE" &&
    status !== "TIMEOUT" &&
    status !== "REJECTED" &&
    status !== "CANCELLED"
  ) {
    return null;
  }
  const requiredNumbers = ["startedAt", "finishedAt", "durationMs"] as const;
  if (
    requiredNumbers.some(
      (key) => typeof value[key] !== "number" || !Number.isFinite(value[key])
    )
  ) {
    return null;
  }
  return {
    protocolVersion: 2,
    taskId: value.taskId as string,
    deviceId: value.deviceId as string,
    scriptId: value.scriptId as string,
    status,
    code: value.code as string,
    message: value.message as string,
    data: value.data ?? null,
    startedAt: value.startedAt as number,
    finishedAt: value.finishedAt as number,
    durationMs: value.durationMs as number,
    traceId: value.traceId as string,
  };
}

/** 解析最小 Presence。 */
function parsePresence(value: unknown): DevicePresenceInput | null {
  if (
    !isRecord(value) ||
    value.protocolVersion !== 2 ||
    typeof value.deviceId !== "string" ||
    (value.status !== "ONLINE" && value.status !== "OFFLINE") ||
    typeof value.timestamp !== "number"
  ) {
    return null;
  }
  return {
    protocolVersion: 2,
    deviceId: value.deviceId,
    status: value.status,
    timestamp: value.timestamp,
  };
}

/** 解析进程级设备信息。 */
function parseDeviceInfo(value: unknown): DeviceInfoInput | null {
  if (
    !isRecord(value) ||
    value.protocolVersion !== 2 ||
    typeof value.deviceId !== "string" ||
    typeof value.timestamp !== "number" ||
    typeof value.manufacturer !== "string" ||
    typeof value.brand !== "string" ||
    typeof value.model !== "string" ||
    typeof value.androidVersion !== "string" ||
    (typeof value.androidSdk !== "number" && value.androidSdk !== null) ||
    typeof value.autojs6Version !== "string" ||
    typeof value.clientVersion !== "string" ||
    !isRecord(value.identifiers) ||
    !Array.isArray(value.identifiers.imeis) ||
    !value.identifiers.imeis.every((item) => typeof item === "string") ||
    (value.identifiers.imeiStatus !== "available" &&
      value.identifiers.imeiStatus !== "unavailable") ||
    (typeof value.identifiers.serialNumber !== "string" &&
      value.identifiers.serialNumber !== null) ||
    (value.identifiers.serialStatus !== "available" &&
      value.identifiers.serialStatus !== "unavailable") ||
    !isRecord(value.capabilities) ||
    !isRecord(value.reportedExtra)
  ) {
    return null;
  }
  return {
    protocolVersion: 2,
    deviceId: value.deviceId,
    timestamp: value.timestamp,
    manufacturer: value.manufacturer,
    brand: value.brand,
    model: value.model,
    androidVersion: value.androidVersion,
    androidSdk: value.androidSdk as number | null,
    autojs6Version: value.autojs6Version,
    clientVersion: value.clientVersion,
    identifiers: {
      imeis: value.identifiers.imeis,
      imeiStatus: value.identifiers.imeiStatus,
      serialNumber: value.identifiers.serialNumber as string | null,
      serialStatus: value.identifiers.serialStatus,
    },
    capabilities: value.capabilities,
    reportedExtra: value.reportedExtra,
  };
}

/** 解析带 eventId 的设备事件。 */
function parseDeviceEvent(value: unknown): DeviceEventInput | null {
  if (
    !isRecord(value) ||
    value.protocolVersion !== 2 ||
    typeof value.eventId !== "string" ||
    typeof value.deviceId !== "string" ||
    (value.type !== "battery" &&
      value.type !== "network" &&
      value.type !== "sms" &&
      value.type !== "notification") ||
    typeof value.timestamp !== "number" ||
    !isRecord(value.data)
  ) {
    return null;
  }
  return {
    protocolVersion: 2,
    eventId: value.eventId,
    deviceId: value.deviceId,
    type: value.type,
    timestamp: value.timestamp,
    data: value.data,
  };
}

/** 校验 Topic 中设备标识与载荷一致。 */
function assertTopicDevice(topic: string, deviceId: string): void {
  if (topic.split("/")[3] !== deviceId) {
    throw new Error("Payload deviceId does not match MQTT topic");
  }
}

/** 校验独立部署管理 Topic 中的设备标识。 */
function assertDeploymentTopicDevice(topic: string, deviceId: string): void {
  if (topic.split("/")[4] !== deviceId) {
    throw new Error("Deployment payload deviceId does not match MQTT topic");
  }
}

/** 按 Topic 路由一条 MQTT 入站消息。 */
async function routeMessage(topic: string, payload: Buffer): Promise<void> {
  const value: unknown = JSON.parse(payload.toString());
  if (
    topic.startsWith("autojs6/deploy/v1/devices/") &&
    topic.endsWith("/events")
  ) {
    const event = parseDeviceDeploymentEvent(value);
    if (!event) throw new Error("Invalid AutoJS6 deployment event payload");
    assertDeploymentTopicDevice(topic, event.deviceId);
    await processIncomingDeploymentEvent(event);
    return;
  }
  if (topic.startsWith("autojs6/v2/devices/") && topic.endsWith("/results")) {
    const result = parseTaskResult(value);
    if (!result) throw new Error("Invalid AutoJS6 v2 task result payload");
    assertTopicDevice(topic, result.deviceId);
    await processIncomingDeviceTaskResult(result);
    return;
  }
  if (topic.startsWith("autojs6/v2/devices/") && topic.endsWith("/presence")) {
    const presence = parsePresence(value);
    if (!presence) throw new Error("Invalid AutoJS6 Presence payload");
    assertTopicDevice(topic, presence.deviceId);
    await processDevicePresence(presence);
    deviceEventBus.emit("device_presence", presence);
    console.log(
      `[DEVICE_PRESENCE] [${await deviceLogLabel(presence.deviceId)}] ${presence.status}`
    );
    return;
  }
  if (topic.startsWith("autojs6/v2/devices/") && topic.endsWith("/info")) {
    const info = parseDeviceInfo(value);
    if (!info) throw new Error("Invalid AutoJS6 device info payload");
    assertTopicDevice(topic, info.deviceId);
    await processDeviceInfo(info);
    console.log(
      `[DEVICE_INFO] [${await deviceLogLabel(info.deviceId)}] snapshot updated`
    );
    return;
  }
  if (topic.startsWith("autojs6/v2/devices/") && topic.endsWith("/events")) {
    const event = parseDeviceEvent(value);
    if (!event) throw new Error("Invalid AutoJS6 device event payload");
    assertTopicDevice(topic, event.deviceId);
    const result = await processDeviceEvent(event);
    deviceEventBus.emit("device_event", {
      clientId: event.deviceId,
      type: event.type,
      timestamp: event.timestamp,
      data: {},
    } satisfies DeviceEventPayload);
    console.log(
      `[DEVICE_EVENT] [${await deviceLogLabel(event.deviceId)}] [${event.type}] duplicate=${result.duplicate}`
    );
  }
}

/** 启动后端 MQTT 设备事件、任务结果、Info 与 Presence 长连接监听。 */
export async function startMqttEventListener(): Promise<void> {
  if (started) return;
  initializeMobileTaskResultHandlers();
  started = true;
  try {
    const credentials = await getActiveCredentials();
    const configuredClientId = String(
      getEnv("AUTOJS6_MQTT_RESULT_CLIENT_ID") || ""
    ).trim();
    const clientId =
      configuredClientId || `${credentials.clientId}_autojs6_result_listener`;
    mqttClient = mqtt.connect(credentials.brokerUrl, {
      protocolVersion: 5,
      clientId,
      username: credentials.username,
      password: credentials.password,
      clean: false,
      properties: { sessionExpiryInterval: 86_400 },
      reconnectPeriod: 5000,
    });

    mqttClient.on("connect", () => {
      const topics = [
        "autojs6/v2/devices/+/events",
        "autojs6/v2/devices/+/results",
        "autojs6/v2/devices/+/presence",
        "autojs6/v2/devices/+/info",
        "autojs6/deploy/v1/devices/+/events",
      ];
      mqttClient?.subscribe(topics, { qos: 1 }, (error) => {
        if (error) console.error("[MQTT_LISTENER] Subscribe failed", error);
        else console.log(`[MQTT_LISTENER] Subscribed ${topics.join(", ")}`);
      });
    });
    mqttClient.on("message", (topic, payload) => {
      void routeMessage(topic, payload).catch((error) => {
        const topicKind = topic.split("/").at(-1) ?? "unknown";
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[MQTT_LISTENER] Failed to process ${topicKind}: ${message}`
        );
      });
    });
    mqttClient.on("error", (error) =>
      console.error("[MQTT_LISTENER] MQTT connection error", error)
    );

    timeoutScanner ??= setInterval(() => {
      void Promise.all([
        timeoutExpiredDeviceTasks(),
        timeoutExpiredClientDeployments(),
        markTimedOutDevicesOffline(),
      ]).catch((error) =>
        console.error("[AUTOJS6] Periodic timeout scan failed", error)
      );
    }, 60_000);
    retentionScanner ??= setInterval(
      () => {
        void cleanupExpiredDeviceEvents().catch((error) =>
          console.error("[AUTOJS6] Device event cleanup failed", error)
        );
      },
      24 * 60 * 60 * 1000
    );
    void cleanupExpiredDeviceEvents().catch((error) =>
      console.error("[AUTOJS6] Initial device event cleanup failed", error)
    );
  } catch (error) {
    started = false;
    console.error("[MQTT_LISTENER] Failed to start", error);
  }
}
