import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const ossTranslations = {
  "oss.config": [
    {
      application: "backend",
      tKey: "errorHandler.oss.config.duplicateName",
      langCodes: {
        "zh-CN": "存储配置名称已存在",
        "en-US": "OSS configuration name already exists",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.oss.config.initFailed",
      langCodes: {
        "zh-CN": "无法初始化存储实例，请检查配置信息或运行环境",
        "en-US":
          "Failed to initialize storage instance. Please check configuration or environment.",
      },
    },
  ],
  "oss.file": [],
} satisfies Record<
  Extract<BusinessKey, "oss.config" | "oss.file">,
  TranslationInputItem[]
>;
