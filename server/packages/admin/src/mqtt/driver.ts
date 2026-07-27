import crypto from "node:crypto";

/**
 * MQTT 服务提供商枚举
 */
export type MqttProvider = "EMQX" | "Aliyun";

/**
 * MQTT 系统配置结构定义
 */
export interface MqttConfigOptions {
  provider?: MqttProvider;
  host?: string;
  port?: number;
  protocol?: string;
  clientId?: string;
  username?: string | null;
  password?: string | null;
  instanceId?: string | null;
  accessKey?: string | null;
  secretKey?: string | null;
  productKey?: string | null;
  deviceName?: string | null;
  keepalive?: number;
  cleanSession?: boolean;
}

/**
 * MQTT 计算后的连接凭证对象
 */
export interface MqttConnectionCredentials {
  provider: MqttProvider;
  brokerUrl: string;
  clientId: string;
  username: string;
  password: string;
  keepalive: number;
  cleanSession: boolean;
}

/**
 * 阿里云微消息队列 MQTT / IoT 平台签名计算逻辑
 *
 * 微消息队列 MQTT 版算法:
 *  - Username: Signature|AccessKeyId|InstanceId
 *  - Password: HmacSHA1(clientId, AccessKeySecret) -> Base64
 *
 * @param config MQTT 配置选项
 * @returns 包含计算出的 Username 与 Password 的对象
 */
export function calculateAliyunMqttSign(config: MqttConfigOptions): {
  username: string;
  password: string;
} {
  const accessKey = config.accessKey || config.username || "";
  const secretKey = config.secretKey || config.password || "";
  const instanceId = config.instanceId || "";
  const clientId = config.clientId || "";

  // 微消息队列 MQTT 版签名机制
  if (instanceId) {
    const username = `Signature|${accessKey}|${instanceId}`;
    const hmac = crypto.createHmac("sha1", secretKey);
    hmac.update(clientId);
    const password = hmac.digest("base64");
    return { username, password };
  }

  // 阿里云 IoT 平台三元组模式
  if (config.productKey && config.deviceName) {
    const username = `${config.deviceName}&${config.productKey}`;
    const signContent = `clientId${clientId}deviceName${config.deviceName}productKey${config.productKey}`;
    const hmac = crypto.createHmac("sha1", secretKey);
    hmac.update(signContent);
    const password = hmac.digest("hex");
    return { username, password };
  }

  // 兜底退回通用凭证
  return {
    username: accessKey,
    password: secretKey,
  };
}

/**
 * 解析并生成标准的 MQTT 连接凭证
 *
 * @param config 业务底座配置
 * @returns 标准的连接凭证与 URL
 */
export function getMqttConnectionInfo(
  config: MqttConfigOptions
): MqttConnectionCredentials {
  const provider: MqttProvider =
    config.provider === "Aliyun" ? "Aliyun" : "EMQX";
  const protocol = config.protocol || "mqtt";
  const host = config.host || "127.0.0.1";
  const port = config.port || 1883;
  const clientId = config.clientId || "hodor_admin_client";
  const keepalive = config.keepalive ?? 60;
  const cleanSession = config.cleanSession ?? true;

  const brokerUrl = `${protocol}://${host}:${port}`;

  if (provider === "Aliyun") {
    const signResult = calculateAliyunMqttSign({
      ...config,
      clientId,
    });
    return {
      provider,
      brokerUrl,
      clientId,
      username: signResult.username,
      password: signResult.password,
      keepalive,
      cleanSession,
    };
  }

  // EMQX 模式直接获取配置的 username 与 password
  return {
    provider,
    brokerUrl,
    clientId,
    username: config.username || "",
    password: config.password || "",
    keepalive,
    cleanSession,
  };
}
