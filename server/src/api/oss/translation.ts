import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const ossTranslations = {
  "oss.config": [
    {
      tKey: "oss.config.title",
      langCodes: {
        "zh-CN": "OSS 配置",
        "en-US": "OSS Configuration",
      },
    },
    {
      tKey: "oss.config.name",
      langCodes: {
        "zh-CN": "配置名称",
        "en-US": "Config Name",
      },
    },
    {
      tKey: "oss.config.provider",
      langCodes: {
        "zh-CN": "提供商",
        "en-US": "Provider",
      },
    },
    {
      tKey: "oss.config.endpoint",
      langCodes: {
        "zh-CN": "Endpoint",
        "en-US": "Endpoint",
      },
    },
    {
      tKey: "oss.config.region",
      langCodes: {
        "zh-CN": "区域",
        "en-US": "Region",
      },
    },
    {
      tKey: "oss.config.accessKey",
      langCodes: {
        "zh-CN": "Access Key",
        "en-US": "Access Key",
      },
    },
    {
      tKey: "oss.config.secretKey",
      langCodes: {
        "zh-CN": "Secret Key",
        "en-US": "Secret Key",
      },
    },
    {
      tKey: "oss.config.bucket",
      langCodes: {
        "zh-CN": "存储桶",
        "en-US": "Bucket",
      },
    },
    {
      tKey: "oss.config.isDefault",
      langCodes: {
        "zh-CN": "默认",
        "en-US": "Is Default",
      },
    },
    {
      tKey: "oss.config.verify",
      langCodes: {
        "zh-CN": "验证连接",
        "en-US": "Verify",
      },
    },
    {
      tKey: "oss.config.accountId",
      langCodes: {
        "zh-CN": "账户ID",
        "en-US": "Account ID",
      },
    },
  ],
  "oss.file": [
    {
      tKey: "oss.file.title",
      langCodes: {
        "zh-CN": "文件中心",
        "en-US": "File Center",
      },
    },
    {
      tKey: "oss.file.upload",
      langCodes: {
        "zh-CN": "上传文件",
        "en-US": "Upload File",
      },
    },
    {
      tKey: "oss.file.download",
      langCodes: {
        "zh-CN": "下载文件",
        "en-US": "Download File",
      },
    },
    {
      tKey: "oss.file.copyUrl",
      langCodes: {
        "zh-CN": "复制链接",
        "en-US": "Copy URL",
      },
    },
    {
      tKey: "oss.file.key",
      langCodes: {
        "zh-CN": "文件对象",
        "en-US": "Object Key",
      },
    },
    {
      tKey: "oss.file.size",
      langCodes: {
        "zh-CN": "大小",
        "en-US": "Size",
      },
    },
    {
      tKey: "oss.file.lastModified",
      langCodes: {
        "zh-CN": "最后修改",
        "en-US": "Last Modified",
      },
    },
    {
      tKey: "oss.file.getDownloadUrl",
      langCodes: {
        "zh-CN": "获取下载链接",
        "en-US": "Get Download Link",
      },
    },
    {
      tKey: "oss.file.name",
      langCodes: {
        "zh-CN": "文件名",
        "en-US": "File Name",
      },
    },
    {
      tKey: "oss.file.contentType",
      langCodes: {
        "zh-CN": "内容类型",
        "en-US": "Content Type",
      },
    },
    {
      tKey: "oss.file.path",
      langCodes: {
        "zh-CN": "上传路径",
        "en-US": "Upload Path",
      },
    },
    {
      tKey: "oss.file.pathPlaceholder",
      langCodes: {
        "zh-CN": "请输入存储路径，为空默认根目录",
        "en-US": "Enter storage path, leave empty for root",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "oss.config" | "oss.file">,
  TranslationInputItem[]
>;
