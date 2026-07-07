import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const ossTranslations = {
  "data.oss.config": [
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
  "data.oss.file": [
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
    {
      tKey: "oss.file.copySuccess",
      langCodes: {
        "zh-CN": "链接已复制到剪贴板",
        "en-US": "URL copied to clipboard",
      },
    },
    {
      tKey: "oss.file.currentDirectorySearch",
      langCodes: {
        "zh-CN": "搜索当前目录",
        "en-US": "Search current directory",
      },
    },
    {
      tKey: "oss.file.emptyDirectory",
      langCodes: {
        "zh-CN": "当前目录为空",
        "en-US": "This directory is empty",
      },
    },
    {
      tKey: "oss.file.root",
      langCodes: {
        "zh-CN": "根目录",
        "en-US": "Root",
      },
    },
    {
      tKey: "oss.file.uploadProgress",
      langCodes: {
        "zh-CN": "上传进度",
        "en-US": "Upload Progress",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "data.oss.config" | "data.oss.file">,
  TranslationInputItem[]
>;
