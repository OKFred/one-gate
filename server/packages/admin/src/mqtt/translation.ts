import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const mqttTranslations: Partial<
  Record<BusinessKey, TranslationInputItem[]>
> = {
  "admin.mqtt": [
    {
      application: "frontend",
      tKey: "sidebar.menu.mqtt",
      langCodes: {
        "zh-CN": "MQTT",
        "en-US": "MQTT",
      },
    },
    {
      application: "frontend",
      tKey: "sidebar.menu.mqtt.console",
      langCodes: {
        "zh-CN": "消息控制台",
        "en-US": "Message Console",
      },
    },
    {
      application: "frontend",
      tKey: "sidebar.menu.mqtt.config",
      langCodes: {
        "zh-CN": "服务配置",
        "en-US": "Service Config",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.title",
      langCodes: {
        "zh-CN": "MQTT 消息管理与配置",
        "en-US": "MQTT Management & Configuration",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.desc",
      langCodes: {
        "zh-CN":
          "支持 EMQX 与 阿里云 MQTT 控制台发布测试、消息收发分析及集群配置管理",
        "en-US":
          "Supports EMQX and Aliyun MQTT console publishing, message analysis and cluster management",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.tab.console",
      langCodes: {
        "zh-CN": "MQTT 消息控制台",
        "en-US": "MQTT Console",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.tab.config",
      langCodes: {
        "zh-CN": "MQTT 服务配置 (SysConfig)",
        "en-US": "MQTT Configuration (SysConfig)",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.title",
      langCodes: {
        "zh-CN": "发布消息测试",
        "en-US": "Publish Message Test",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.topic",
      langCodes: {
        "zh-CN": "Topic 主题",
        "en-US": "Topic",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.topicPlaceholder",
      langCodes: {
        "zh-CN": "例如: sensors/temperature 或 sys/device/data",
        "en-US": "e.g., sensors/temperature or sys/device/data",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.qos",
      langCodes: {
        "zh-CN": "QoS 服务质量",
        "en-US": "QoS Level",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.retain",
      langCodes: {
        "zh-CN": "Retain 保留消息",
        "en-US": "Retain Message",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.payload",
      langCodes: {
        "zh-CN": "Payload 消息体",
        "en-US": "Payload",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.formatJson",
      langCodes: {
        "zh-CN": "格式化 JSON",
        "en-US": "Format JSON",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.payloadPlaceholder",
      langCodes: {
        "zh-CN": "请输入发送消息载荷文本或 JSON 对象...",
        "en-US": "Enter message payload text or JSON...",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.remark",
      langCodes: {
        "zh-CN": "备注说明 (可选)",
        "en-US": "Remark (Optional)",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.submit",
      langCodes: {
        "zh-CN": "发布 MQTT 消息",
        "en-US": "Publish MQTT Message",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.publish.submitting",
      langCodes: {
        "zh-CN": "发送中...",
        "en-US": "Publishing...",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.title",
      langCodes: {
        "zh-CN": "消息日志历史 (base_biz_log)",
        "en-US": "Message Log History",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.filterTopic",
      langCodes: {
        "zh-CN": "筛选 Topic...",
        "en-US": "Filter Topic...",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.allDirections",
      langCodes: {
        "zh-CN": "全部方向",
        "en-US": "All Directions",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.directionOut",
      langCodes: {
        "zh-CN": "发送 (OUT)",
        "en-US": "OUT",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.directionIn",
      langCodes: {
        "zh-CN": "接收 (IN)",
        "en-US": "IN",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.empty",
      langCodes: {
        "zh-CN": "暂无相关 MQTT 消息日志记录",
        "en-US": "No MQTT message logs found",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.colDirection",
      langCodes: {
        "zh-CN": "方向",
        "en-US": "Direction",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.colTopic",
      langCodes: {
        "zh-CN": "Topic 主题",
        "en-US": "Topic",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.colQos",
      langCodes: {
        "zh-CN": "QoS",
        "en-US": "QoS",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.colTime",
      langCodes: {
        "zh-CN": "发生时间",
        "en-US": "Time",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.colPayload",
      langCodes: {
        "zh-CN": "Payload",
        "en-US": "Payload",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.viewPayload",
      langCodes: {
        "zh-CN": "查看",
        "en-US": "View",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.log.payloadDialogTitle",
      langCodes: {
        "zh-CN": "Payload 详细载荷内容",
        "en-US": "Payload Details",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.title",
      langCodes: {
        "zh-CN": "MQTT 基础配置 (namespace = 'mqtt')",
        "en-US": "MQTT Configuration (namespace = 'mqtt')",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.desc",
      langCodes: {
        "zh-CN":
          "继承底座 sys_config 统一管理。支持 EMQX 域名连接与阿里云 MQTT/IoT 服务密钥配置",
        "en-US":
          "Managed by sys_config. Supports EMQX domain connections and Aliyun MQTT/IoT keys",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.create",
      langCodes: {
        "zh-CN": "新建 MQTT 配置",
        "en-US": "Create MQTT Config",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.empty",
      langCodes: {
        "zh-CN": "当前尚未添加 namespace = 'mqtt' 的系统配置",
        "en-US": "No MQTT configuration entries found",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.createDefault",
      langCodes: {
        "zh-CN": "立即创建默认配置",
        "en-US": "Create Default Config",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.primary",
      langCodes: {
        "zh-CN": "主配置",
        "en-US": "Primary",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.providerAliyun",
      langCodes: {
        "zh-CN": "阿里云 MQTT",
        "en-US": "Aliyun MQTT",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.providerEmqx",
      langCodes: {
        "zh-CN": "EMQX",
        "en-US": "EMQX",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.config.edit",
      langCodes: {
        "zh-CN": "编辑配置",
        "en-US": "Edit Config",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.msg.topicRequired",
      langCodes: {
        "zh-CN": "请输入 Topic 主题",
        "en-US": "Please enter Topic",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.msg.payloadRequired",
      langCodes: {
        "zh-CN": "请输入 Payload 消息内容",
        "en-US": "Please enter Payload",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.msg.formatSuccess",
      langCodes: {
        "zh-CN": "JSON 格式化成功",
        "en-US": "JSON formatting succeeded",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.msg.formatInvalid",
      langCodes: {
        "zh-CN": "当前 Payload 不是有效的 JSON 格式",
        "en-US": "Current payload is not a valid JSON format",
      },
    },
    {
      application: "frontend",
      tKey: "admin.mqtt.msg.copied",
      langCodes: {
        "zh-CN": "内容已复制到剪贴板",
        "en-US": "Copied to clipboard",
      },
    },
  ],
};
