import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const baseTranslations: Partial<
  Record<BusinessKey, TranslationInputItem[]>
> = {
  "admin.base": [
    {
      application: "frontend",
      tKey: "sidebar.menu.admin.base.config",
      langCodes: {
        "zh-CN": "系统配置底座",
        "en-US": "Base SysConfig",
      },
    },
  ],
  "admin.base.sys_config": [
    {
      application: "frontend",
      tKey: "admin.base.namespace",
      langCodes: {
        "zh-CN": "命名空间 (Namespace)",
        "en-US": "Namespace",
      },
    },
    {
      application: "frontend",
      tKey: "admin.base.configKey",
      langCodes: {
        "zh-CN": "配置键名 (ConfigKey)",
        "en-US": "Config Key",
      },
    },
    {
      application: "frontend",
      tKey: "admin.base.isPrimary",
      langCodes: {
        "zh-CN": "主配置",
        "en-US": "Is Primary",
      },
    },
    {
      application: "frontend",
      tKey: "admin.base.configValue",
      langCodes: {
        "zh-CN": "配置键值 (ConfigValue)",
        "en-US": "Config Value",
      },
    },
  ],
};
