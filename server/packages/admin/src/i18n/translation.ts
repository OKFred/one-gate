import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const i18nTranslations = {
  "i18n.translation": [
    {
      application: "backend",
      tKey: "errorHandler.i18n.translation.duplicateTKey",
      langCodes: {
        "zh-CN": "该翻译键在同一语言下已存在",
        "en-US": "Translation key already exists for this language",
      },
    },
  ],
  "i18n.region": [
    {
      application: "backend",
      tKey: "errorHandler.i18n.region.duplicateCode",
      langCodes: {
        "zh-CN": "该国家/地区代码已存在（alpha2、alpha3 或 numeric 重复）",
        "en-US":
          "Region code already exists (duplicate alpha2, alpha3, or numeric)",
      },
    },
  ],
  "i18n.language": [
    {
      application: "backend",
      tKey: "errorHandler.i18n.language.duplicateLangCode",
      langCodes: {
        "zh-CN": "该语言代码已存在",
        "en-US": "Language code already exists",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "i18n.translation" | "i18n.region" | "i18n.language">,
  TranslationInputItem[]
>;
