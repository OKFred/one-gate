import { type IDomainConfigProvider } from "../../base/config/model";
import { type JSONSchema } from "json-schema-to-ts";

export class SwarmDockerConfigProvider implements IDomainConfigProvider {
  getNamespace(): string {
    return "swarm";
  }

  getJsonSchema(): Record<string, JSONSchema> {
    return {
      host: {
        type: "string",
        description: "Docker Host 地址",
        examples: ["https://127.0.0.1:2376"],
      },
      apiVersion: {
        type: "string",
        description: "Docker API 版本",
        examples: ["v1.47"],
      },
      tlsVerify: {
        type: "boolean",
        description: "是否启用 TLS 验证",
      },
      caCert: {
        type: ["string", "null"],
        nullable: true,
        description: "CA 证书内容",
      },
      clientCert: {
        type: ["string", "null"],
        nullable: true,
        description: "客户端证书内容",
      },
      clientKey: {
        type: ["string", "null"],
        nullable: true,
        description: "客户端私钥",
      },
      cfMtlsBinding: {
        type: ["string", "null"],
        nullable: true,
        description: "Cloudflare mTLS 证书绑定名称",
      },
    };
  }

  getDefaultValues(): Record<string, any> {
    return {
      host: "http://127.0.0.1:2375",
      tlsVerify: false,
    };
  }
}
