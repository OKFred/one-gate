import { type IDomainConfigProvider } from "../../base/sys_config/model";
import { type JSONSchema } from "json-schema-to-ts";

export class OssConfigProvider implements IDomainConfigProvider {
  getNamespace(): string {
    return "oss";
  }

  getJsonSchema(): Record<string, JSONSchema> {
    return {
      provider: {
        type: "string",
        enum: ["S3", "R2"],
        description: "存储提供商类型",
      },
      endpoint: {
        type: ["string", "null"],
        nullable: true,
        description: "服务地址 (R2 不需要)",
        examples: ["http://localhost:9000"],
      },
      accountId: {
        type: ["string", "null"],
        nullable: true,
        description: "账户 ID (仅 R2 需要)",
      },
      accessKey: {
        type: "string",
        description: "访问密钥 AK",
      },
      secretKey: {
        type: "string",
        description: "私有密钥 SK",
      },
      bucket: {
        type: "string",
        description: "存储桶名称",
      },
      region: {
        type: "string",
        description: "区域",
        default: "auto",
      },
    };
  }

  getDefaultValues(): Record<string, any> {
    return {
      provider: "S3",
      endpoint: "http://localhost:9000",
      region: "auto",
    };
  }
}
