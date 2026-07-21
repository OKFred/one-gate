import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const baseTranslations: Partial<
  Record<BusinessKey, TranslationInputItem[]>
> = {
  "admin.base": [
    {
      tKey: "sidebar.menu.admin.base",
      langCodes: {
        "en-US": "Base",
        "zh-CN": "底座",
      },
    },
  ],
  "admin.base.sys_config": [
    {
      tKey: "sidebar.menu.admin.base.config",
      langCodes: {
        "en-US": "Configurations",
        "zh-CN": "配置项",
      },
    },
    {
      tKey: "admin.base.config",
      langCodes: {
        "en-US": "Base Config",
        "zh-CN": "配置项",
      },
    },
    {
      tKey: "admin.base.namespace",
      langCodes: {
        "en-US": "Namespace",
        "zh-CN": "命名空间",
      },
    },
    {
      tKey: "admin.base.configKey",
      langCodes: {
        "en-US": "Config Key",
        "zh-CN": "配置标识",
      },
    },
    {
      tKey: "admin.base.isPrimary",
      langCodes: {
        "en-US": "Primary",
        "zh-CN": "是否主配置",
      },
    },
    {
      tKey: "admin.base.configValue",
      langCodes: {
        "en-US": "Configuration Value",
        "zh-CN": "配置内容",
      },
    },
  ],
};
