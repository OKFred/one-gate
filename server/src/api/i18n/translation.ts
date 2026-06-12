import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const i18nTranslations = {
  "i18n.translation": [
    {
      tKey: "translation.title",
      langCodes: {
        "zh-CN": "翻译管理",
        "en-US": "Translation Management",
      },
    },
    {
      tKey: "translation.table.application",
      langCodes: {
        "zh-CN": "应用",
        "en-US": "Application",
      },
    },
    {
      tKey: "translation.table.business",
      langCodes: {
        "zh-CN": "业务",
        "en-US": "Business",
      },
    },
    {
      tKey: "translation.table.langCode",
      langCodes: {
        "zh-CN": "语言代码",
        "en-US": "Language Code",
      },
    },
    {
      tKey: "translation.table.tKey",
      langCodes: {
        "zh-CN": "翻译键",
        "en-US": "Translation Key",
      },
    },
    {
      tKey: "translation.table.tValue",
      langCodes: {
        "zh-CN": "翻译值",
        "en-US": "Translation Value",
      },
    },
    {
      tKey: "translation.dialog.duplicateWarning",
      langCodes: {
        "zh-CN": "发现{count}个相同的翻译文案：",
        "en-US": "Found {count} duplicated translation(s):",
      },
    },
    {
      tKey: "translation.dialog.duplicateSuggestion",
      langCodes: {
        "zh-CN": "💡 建议：确认是否需要添加新的翻译文案，或复用现有翻译键",
        "en-US":
          "Tip: Consider reusing an existing key instead of adding a new translation.",
      },
    },
  ],
  "i18n.region": [
    {
      tKey: "region.title",
      langCodes: {
        "zh-CN": "国家地区管理",
        "en-US": "Region Management",
      },
    },
    {
      tKey: "region.table.alpha2Code",
      langCodes: {
        "zh-CN": "ISO两位代码",
        "en-US": "ISO 3166-1 alpha-2",
      },
    },
    {
      tKey: "region.table.alpha3Code",
      langCodes: {
        "zh-CN": "ISO三位代码",
        "en-US": "ISO 3166-1 alpha-3",
      },
    },
    {
      tKey: "region.table.numeric",
      langCodes: {
        "zh-CN": "数字代码",
        "en-US": "Numeric Code",
      },
    },
    {
      tKey: "region.table.iso3166Independent",
      langCodes: {
        "zh-CN": "是否ISO3166独立主权国家",
        "en-US": "Is Independent Country / Region in ISO3166",
      },
    },
    {
      tKey: "region.table.businessLanguages",
      langCodes: {
        "zh-CN": "业务语言",
        "en-US": "Business Languages",
      },
    },
  ],
  "i18n.language": [
    {
      tKey: "language.title",
      langCodes: {
        "zh-CN": "语言管理",
        "en-US": "Language Management",
      },
    },
    {
      tKey: "language.table.langCode",
      langCodes: {
        "zh-CN": "语言代码",
        "en-US": "Language Code",
      },
    },
    {
      tKey: "language.table.nativeName",
      langCodes: {
        "zh-CN": "本地名称",
        "en-US": "Native Name",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "i18n.translation" | "i18n.region" | "i18n.language">,
  TranslationInputItem[]
>;
