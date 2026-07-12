import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const browserTranslations = {
  "infra.rpa.browser": [
    {
      tKey: "sidebar.menu.infra.rpa.browser",
      langCodes: {
        "zh-CN": "浏览器配置",
        "en-US": "Browser Configuration",
      },
    },
    {
      tKey: "infra.rpa.browser.verifySuccess",
      langCodes: {
        "zh-CN": "CDP 浏览器配置连通性验证成功！",
        "en-US": "CDP connection verified successfully!",
      },
    },
    {
      tKey: "infra.rpa.browser.verifyFailed",
      langCodes: {
        "zh-CN": "验证失败，请确认 CDP WebSocket 服务是否正常开启。",
        "en-US":
          "Verification failed. Please verify that the CDP WebSocket service is active.",
      },
    },
    {
      tKey: "infra.rpa.browser.name",
      langCodes: {
        "zh-CN": "配置名称",
        "en-US": "Configuration Name",
      },
    },
    {
      tKey: "infra.rpa.browser.cdpUrlLabel",
      langCodes: {
        "zh-CN": "CDP 调试地址",
        "en-US": "CDP Debug Address",
      },
    },
    {
      tKey: "infra.rpa.browser.defaultEnv",
      langCodes: {
        "zh-CN": "默认环境",
        "en-US": "Default Environment",
      },
    },
    {
      tKey: "infra.rpa.browser.yes",
      langCodes: {
        "zh-CN": "是",
        "en-US": "Yes",
      },
    },
    {
      tKey: "infra.rpa.browser.no",
      langCodes: {
        "zh-CN": "否",
        "en-US": "No",
      },
    },
    {
      tKey: "infra.rpa.browser.status",
      langCodes: {
        "zh-CN": "状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "infra.rpa.browser.enabled",
      langCodes: {
        "zh-CN": "启用",
        "en-US": "Enabled",
      },
    },
    {
      tKey: "infra.rpa.browser.disabled",
      langCodes: {
        "zh-CN": "禁用",
        "en-US": "Disabled",
      },
    },
    {
      tKey: "infra.rpa.browser.cdpUrlCardLabel",
      langCodes: {
        "zh-CN": "CDP 地址",
        "en-US": "CDP Address",
      },
    },
    {
      tKey: "infra.rpa.browser.default",
      langCodes: {
        "zh-CN": "默认",
        "en-US": "Default",
      },
    },
    {
      tKey: "infra.rpa.browser.testConnection",
      langCodes: {
        "zh-CN": "测试连接",
        "en-US": "Test Connection",
      },
    },
    {
      tKey: "infra.rpa.browser.verifyError",
      langCodes: {
        "zh-CN": "连通性验证请求出错，请重试。",
        "en-US": "Connection verification request failed, please try again.",
      },
    },
    {
      tKey: "infra.rpa.browser.cdpUrlFormLabel",
      langCodes: {
        "zh-CN": "CDP 连接地址 (ws:// 或 host:port)",
        "en-US": "CDP Connection Address (ws:// or host:port)",
      },
    },
    {
      tKey: "infra.rpa.browser.cdpUrlHelper",
      langCodes: {
        "zh-CN":
          "示例: 127.0.0.1:9222 或 ws://127.0.0.1:9222/devtools/browser/...",
        "en-US":
          "Example: 127.0.0.1:9222 or ws://127.0.0.1:9222/devtools/browser/...",
      },
    },
    {
      tKey: "infra.rpa.browser.setDefaultEnv",
      langCodes: {
        "zh-CN": "设为默认环境 (设置为默认后将自动取消其他环境的默认标识)",
        "en-US":
          "Set as Default Environment (setting as default will automatically cancel other default flags)",
      },
    },
    {
      tKey: "infra.rpa.browser.enableEnv",
      langCodes: {
        "zh-CN": "启用环境",
        "en-US": "Enable Environment",
      },
    },
    {
      tKey: "infra.rpa.browser.remark",
      langCodes: {
        "zh-CN": "备注",
        "en-US": "Remark",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "infra.rpa.browser">,
  TranslationInputItem[]
>;
