import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const browserTranslations = {
  "admin.rpa.browser": [
    {
      tKey: "sidebar.menu.admin.rpa.browser",
      langCodes: {
        "zh-CN": "浏览器配置",
        "en-US": "Browser Configuration",
      },
    },
    {
      tKey: "admin.rpa.browser.verifySuccess",
      langCodes: {
        "zh-CN": "CDP 浏览器配置连通性验证成功！",
        "en-US": "CDP connection verified successfully!",
      },
    },
    {
      tKey: "admin.rpa.browser.verifyFailed",
      langCodes: {
        "zh-CN": "验证失败，请确认 CDP WebSocket 服务是否正常开启。",
        "en-US":
          "Verification failed. Please verify that the CDP WebSocket service is active.",
      },
    },
    {
      tKey: "admin.rpa.browser.name",
      langCodes: {
        "zh-CN": "配置名称",
        "en-US": "Configuration Name",
      },
    },
    {
      tKey: "admin.rpa.browser.cdpUrlLabel",
      langCodes: {
        "zh-CN": "CDP 调试地址",
        "en-US": "CDP Debug Address",
      },
    },
    {
      tKey: "admin.rpa.browser.defaultEnv",
      langCodes: {
        "zh-CN": "默认环境",
        "en-US": "Default Environment",
      },
    },
    {
      tKey: "admin.rpa.browser.yes",
      langCodes: {
        "zh-CN": "是",
        "en-US": "Yes",
      },
    },
    {
      tKey: "admin.rpa.browser.no",
      langCodes: {
        "zh-CN": "否",
        "en-US": "No",
      },
    },
    {
      tKey: "admin.rpa.browser.status",
      langCodes: {
        "zh-CN": "状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "admin.rpa.browser.enabled",
      langCodes: {
        "zh-CN": "启用",
        "en-US": "Enabled",
      },
    },
    {
      tKey: "admin.rpa.browser.disabled",
      langCodes: {
        "zh-CN": "禁用",
        "en-US": "Disabled",
      },
    },
    {
      tKey: "admin.rpa.browser.cdpUrlCardLabel",
      langCodes: {
        "zh-CN": "CDP 地址",
        "en-US": "CDP Address",
      },
    },
    {
      tKey: "admin.rpa.browser.default",
      langCodes: {
        "zh-CN": "默认",
        "en-US": "Default",
      },
    },
    {
      tKey: "admin.rpa.browser.testConnection",
      langCodes: {
        "zh-CN": "测试连接",
        "en-US": "Test Connection",
      },
    },
    {
      tKey: "admin.rpa.browser.verifyError",
      langCodes: {
        "zh-CN": "连通性验证请求出错，请重试。",
        "en-US": "Connection verification request failed, please try again.",
      },
    },
    {
      tKey: "admin.rpa.browser.cdpUrlFormLabel",
      langCodes: {
        "zh-CN": "CDP 连接地址 (ws:// 或 host:port)",
        "en-US": "CDP Connection Address (ws:// or host:port)",
      },
    },
    {
      tKey: "admin.rpa.browser.cdpUrlHelper",
      langCodes: {
        "zh-CN":
          "自托管示例: 127.0.0.1:9222；Cloudflare 模式格式: https://api.cloudflare.com/client/v4/accounts/<您的ACCOUNT_ID>/browser-rendering",
        "en-US":
          "Self-hosted e.g.: 127.0.0.1:9222; Cloudflare format: https://api.cloudflare.com/client/v4/accounts/<YOUR_ACCOUNT_ID>/browser-rendering",
      },
    },
    {
      tKey: "admin.rpa.browser.setDefaultEnv",
      langCodes: {
        "zh-CN": "设为默认环境 (设置为默认后将自动取消其他环境的默认标识)",
        "en-US":
          "Set as Default Environment (setting as default will automatically cancel other default flags)",
      },
    },
    {
      tKey: "admin.rpa.browser.enableEnv",
      langCodes: {
        "zh-CN": "启用环境",
        "en-US": "Enable Environment",
      },
    },
    {
      tKey: "admin.rpa.browser.remark",
      langCodes: {
        "zh-CN": "备注",
        "en-US": "Remark",
      },
    },
    {
      tKey: "admin.rpa.browser.authToken",
      langCodes: {
        "zh-CN": "认证 Token",
        "en-US": "Authentication Token",
      },
    },
    {
      tKey: "admin.rpa.browser.authTokenHelper",
      langCodes: {
        "zh-CN":
          "认证 Token（可选）。填写后自动切换为 Cloudflare Browser Run 模式，使用 Bearer Token 进行身份验证",
        "en-US":
          "Authentication Token (Optional). Specifying this will automatically switch to Cloudflare Browser Run mode, using the Bearer Token for authentication.",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "admin.rpa.browser">,
  TranslationInputItem[]
>;
