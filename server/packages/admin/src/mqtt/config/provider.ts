import { type IDomainConfigProvider } from "../../base/sys_config/model.js";
import { type JSONSchema } from "json-schema-to-ts";

/**
 * MQTT 领域配置 Provider
 * 提供 MQTT 通信相关配置的 Schema 定义与默认值，兼容 EMQX 与 阿里云 MQTT/IoT
 */
export class MqttConfigProvider implements IDomainConfigProvider {
  /**
   * 获取配置命名空间
   * @returns 命名空间字符串 "mqtt"
   */
  getNamespace(): string {
    return "mqtt";
  }

  /**
   * 获取 MQTT 配置的 JSON Schema
   * @returns JSONSchema 规则对象
   */
  getJsonSchema(): Record<string, JSONSchema> {
    return {
      provider: {
        type: "string",
        enum: ["EMQX", "Aliyun"],
        description: "MQTT 服务提供商 (EMQX 自建 / 阿里云 MQTT 或 IoT 平台)",
      },
      host: {
        type: "string",
        description: "MQTT Broker 服务地址 / 域名",
        examples: ["127.0.0.1", "mqtt.cn-hangzhou.aliyuncs.com"],
      },
      port: {
        type: "number",
        description: "端口号 (如 1883, 8883, 8083)",
        default: 1883,
      },
      protocol: {
        type: "string",
        enum: ["mqtt", "mqtts", "ws", "wss"],
        description: "传输协议",
        default: "mqtt",
      },
      clientId: {
        type: "string",
        description: "客户端 ID (ClientId)",
      },
      username: {
        type: ["string", "null"],
        nullable: true,
        description: "认证用户名 (EMQX 模式或阿里云 DeviceId)",
      },
      password: {
        type: ["string", "null"],
        nullable: true,
        description: "认证密码 (EMQX 模式)",
      },
      instanceId: {
        type: ["string", "null"],
        nullable: true,
        description: "阿里云 MQTT 实例 ID (微消息队列 MQTT / 企业版实例)",
      },
      accessKey: {
        type: ["string", "null"],
        nullable: true,
        description: "阿里云 AccessKey ID (Aliyun 模式)",
      },
      secretKey: {
        type: ["string", "null"],
        nullable: true,
        description: "阿里云 AccessKey Secret (Aliyun 模式)",
      },
      productKey: {
        type: ["string", "null"],
        nullable: true,
        description: "阿里云 IoT 平台 ProductKey (可选)",
      },
      deviceName: {
        type: ["string", "null"],
        nullable: true,
        description: "阿里云 IoT 平台 DeviceName (可选)",
      },
      keepalive: {
        type: "number",
        description: "心跳维持时间 (秒)",
        default: 60,
      },
      cleanSession: {
        type: "boolean",
        description: "是否清除会话 (Clean Session)",
        default: true,
      },
    };
  }

  /**
   * 获取默认配置参数
   * @returns 默认配置映射对象
   */
  getDefaultValues(): Record<string, unknown> {
    return {
      provider: "EMQX",
      host: "127.0.0.1",
      port: 1883,
      protocol: "mqtt",
      clientId: "hodor_server_admin",
      keepalive: 60,
      cleanSession: true,
    };
  }
}
