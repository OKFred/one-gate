import { type IDomainConfigProvider } from "../../base/config/model";
import { type JSONSchema } from "json-schema-to-ts";

export class RpaConfigProvider implements IDomainConfigProvider {
  getNamespace(): string {
    return "rpa";
  }

  getJsonSchema(): Record<string, JSONSchema> {
    return {
      cdpUrl: {
        type: "string",
        description:
          "CDP 协议调试连接地址 (e.g. ws://127.0.0.1:9222/devtools/browser/... 或调试主机:端口)。使用 Cloudflare Browser Run 时填写 https://api.cloudflare.com/client/v4/accounts/<您的ACCOUNT_ID>/browser-rendering",
      },
      authToken: {
        type: ["string", "null"],
        nullable: true,
        description:
          "认证 Token（可选）。填写后自动切换为 Cloudflare Browser Run 模式，使用 Bearer Token 进行身份验证",
        maxLength: 500,
      },
    };
  }

  getDefaultValues(): Record<string, any> {
    return {
      cdpUrl: "ws://127.0.0.1:9222/devtools/browser/",
    };
  }
}
