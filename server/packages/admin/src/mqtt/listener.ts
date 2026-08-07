import { EventEmitter } from "events";
import mqtt from "mqtt";
import { getActiveCredentials } from "./service.js";

/**
 * 设备上报事件数据结构
 */
export interface DeviceEventPayload {
  /** 设备标识 (Mqtt ClientId) */
  clientId: string;
  /** 事件类型: battery | network | sms 等 */
  type: string;
  /** 事件触发时间戳 (毫秒) */
  timestamp: number;
  /** 事件具体数据 */
  data: Record<string, unknown>;
}

/**
 * 全局设备事件总线，供系统的其他服务订阅设备上报事件
 */
export const deviceEventBus = new EventEmitter();

let isListening = false;
let mqttClient: mqtt.MqttClient | null = null;

/**
 * 启动后端 MQTT 设备状态/事件监听服务
 * 自动订阅 autojs6/events/# 主题，解析并打日志，并分发到 deviceEventBus
 */
export async function startMqttEventListener(): Promise<void> {
  if (isListening) {
    return;
  }

  try {
    const credentials = await getActiveCredentials();
    const clientId = `${credentials.clientId}_server_listener_${Date.now().toString(36)}`;

    mqttClient = mqtt.connect(credentials.brokerUrl, {
      clientId,
      username: credentials.username,
      password: credentials.password,
      clean: true,
      reconnectPeriod: 5000,
    });

    mqttClient.on("connect", () => {
      console.log(`[MQTT_LISTENER] Connected to broker successfully.`);
      mqttClient?.subscribe("autojs6/events/#", (err) => {
        if (!err) {
          console.log(`[MQTT_LISTENER] Subscribed to autojs6/events/#`);
          isListening = true;
        } else {
          console.error(
            `[MQTT_LISTENER] Failed to subscribe to autojs6/events/#:`,
            err
          );
        }
      });
    });

    mqttClient.on("message", (topic: string, payload: Buffer) => {
      try {
        const messageStr = payload.toString();
        const data = JSON.parse(messageStr) as Partial<DeviceEventPayload>;

        const clientId = data.clientId || "unknown_device";
        const type = data.type || "unknown_type";
        const timestamp = data.timestamp || Date.now();
        const eventData = (data.data || {}) as Record<string, unknown>;

        const eventPayload: DeviceEventPayload = {
          clientId,
          type,
          timestamp,
          data: eventData,
        };

        console.log(
          `[DEVICE_EVENT] [${clientId}] [${type}] payload:`,
          JSON.stringify(eventData)
        );

        deviceEventBus.emit("device_event", eventPayload);
      } catch (err) {
        console.error(
          `[MQTT_LISTENER] Failed to parse message on topic ${topic}:`,
          err
        );
      }
    });

    mqttClient.on("error", (err) => {
      console.error(`[MQTT_LISTENER] MQTT connection error:`, err);
    });
  } catch (err) {
    console.error(`[MQTT_LISTENER] Failed to start MQTT event listener:`, err);
  }
}
