import { EventEmitter } from "events";
import mqtt from "mqtt";

import {
  processIncomingDeviceTaskResult,
  timeoutExpiredDeviceTasks,
  type DeviceTaskResultPayload,
} from "../mobile/async-task/service.js";
import { getActiveCredentials } from "./service.js";

/** 设备上报事件数据结构。 */
export interface DeviceEventPayload {
  clientId: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

/** 设备在线状态与能力消息。 */
export interface DevicePresencePayload {
  protocolVersion: 2;
  deviceId: string;
  status: "ONLINE" | "OFFLINE";
  clientVersion: string;
  timestamp: number;
  scripts: Array<{ scriptId: string; version: number }>;
}

/** 设备事件总线，供其他服务订阅事件与 Presence。 */
export const deviceEventBus = new EventEmitter();

let mqttClient: mqtt.MqttClient | null = null;
let started = false;
let timeoutScanner: ReturnType<typeof setInterval> | null = null;

/** 判断值是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  if (requiredStrings.some((key) => typeof value[key] !== "string"))
    return null;
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
  if (requiredNumbers.some((key) => typeof value[key] !== "number"))
    return null;
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

/** 处理 v1/v2 设备事件并转发到事件总线。 */
function handleEventMessage(value: unknown): void {
  if (!isRecord(value)) return;
  const clientId =
    typeof value.deviceId === "string"
      ? value.deviceId
      : typeof value.clientId === "string"
        ? value.clientId
        : "unknown_device";
  const eventPayload: DeviceEventPayload = {
    clientId,
    type: typeof value.type === "string" ? value.type : "unknown_type",
    timestamp:
      typeof value.timestamp === "number" ? value.timestamp : Date.now(),
    data: isRecord(value.data) ? value.data : {},
  };
  console.log(
    `[DEVICE_EVENT] [${eventPayload.clientId}] [${eventPayload.type}]`,
    JSON.stringify(eventPayload.data)
  );
  deviceEventBus.emit("device_event", eventPayload);
}

/** 处理设备在线状态与脚本能力消息。 */
function handlePresenceMessage(value: unknown): void {
  if (!isRecord(value) || value.protocolVersion !== 2) return;
  if (typeof value.deviceId !== "string" || typeof value.status !== "string")
    return;
  deviceEventBus.emit("device_presence", value);
  console.log(`[DEVICE_PRESENCE] [${value.deviceId}] ${value.status}`);
}

/** 按 Topic 路由一条 MQTT 入站消息。 */
async function routeMessage(topic: string, payload: Buffer): Promise<void> {
  const value: unknown = JSON.parse(payload.toString());
  if (topic.startsWith("autojs6/v2/devices/") && topic.endsWith("/results")) {
    const result = parseTaskResult(value);
    if (!result) throw new Error("Invalid AutoJS6 v2 task result payload");
    const topicDeviceId = topic.split("/")[3];
    if (topicDeviceId !== result.deviceId) {
      throw new Error("Result deviceId does not match MQTT topic");
    }
    await processIncomingDeviceTaskResult(result);
    return;
  }
  if (topic.startsWith("autojs6/v2/devices/") && topic.endsWith("/presence")) {
    handlePresenceMessage(value);
    return;
  }
  handleEventMessage(value);
}

/**
 * 启动后端 MQTT 设备事件、任务结果与 Presence 长连接监听服务。
 */
export async function startMqttEventListener(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const credentials = await getActiveCredentials();
    mqttClient = mqtt.connect(credentials.brokerUrl, {
      clientId: `${credentials.clientId}_server_listener_${Date.now().toString(36)}`,
      username: credentials.username,
      password: credentials.password,
      clean: true,
      reconnectPeriod: 5000,
    });

    mqttClient.on("connect", () => {
      const topics = [
        "autojs6/events/#",
        "autojs6/v2/devices/+/events",
        "autojs6/v2/devices/+/results",
        "autojs6/v2/devices/+/presence",
      ];
      mqttClient?.subscribe(topics, { qos: 1 }, (error) => {
        if (error) console.error("[MQTT_LISTENER] Subscribe failed", error);
        else console.log(`[MQTT_LISTENER] Subscribed ${topics.join(", ")}`);
      });
    });

    mqttClient.on("message", (topic, payload) => {
      void routeMessage(topic, payload).catch((error) =>
        console.error(`[MQTT_LISTENER] Failed to process ${topic}`, error)
      );
    });
    mqttClient.on("error", (error) =>
      console.error("[MQTT_LISTENER] MQTT connection error", error)
    );
    timeoutScanner ??= setInterval(() => {
      void timeoutExpiredDeviceTasks()
        .then((count) => {
          if (count > 0)
            console.warn(`[AUTOJS6_TASK] Marked ${count} task(s) as TIMEOUT`);
        })
        .catch((error) =>
          console.error("[AUTOJS6_TASK] Timeout scan failed", error)
        );
    }, 60_000);
  } catch (error) {
    started = false;
    console.error("[MQTT_LISTENER] Failed to start", error);
  }
}
