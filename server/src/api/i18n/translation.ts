import type { BatchTranslationItem } from "@/db/initTranslation";

export const i18nTranslations: BatchTranslationItem[] = [
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译管理",
      "en-US": "Translation Management",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.application",
    isEnabled: true,
    langCodes: {
      "zh-CN": "应用",
      "en-US": "Application",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.business",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务",
      "en-US": "Business",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.langCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言代码",
      "en-US": "Language Code",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.tKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译键",
      "en-US": "Translation Key",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.tValue",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译值",
      "en-US": "Translation Value",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.dialog.duplicateWarning",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发现{count}个相同的翻译文案：",
      "en-US": "Found {count} duplicated translation(s):",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.dialog.duplicateSuggestion",
    isEnabled: true,
    langCodes: {
      "zh-CN": "💡 建议：确认是否需要添加新的翻译文案，或复用现有翻译键",
      "en-US":
        "Tip: Consider reusing an existing key instead of adding a new translation.",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国家地区管理",
      "en-US": "Region Management",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.alpha2Code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ISO两位代码",
      "en-US": "ISO 3166-1 alpha-2",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.alpha3Code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ISO三位代码",
      "en-US": "ISO 3166-1 alpha-3",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.numeric",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数字代码",
      "en-US": "Numeric Code",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.iso3166Independent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "是否ISO3166独立主权国家",
      "en-US": "Is Independent Country / Region in ISO3166",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.businessLanguages",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务语言",
      "en-US": "Business Languages",
    },
  },
  {
    application: "frontend",
    business: "i18n.language",
    tKey: "language.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言管理",
      "en-US": "Language Management",
    },
  },
  {
    application: "frontend",
    business: "i18n.language",
    tKey: "language.table.langCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言代码",
      "en-US": "Language Code",
    },
  },
  {
    application: "frontend",
    business: "i18n.language",
    tKey: "language.table.nativeName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "本地名称",
      "en-US": "Native Name",
    },
  },
];
