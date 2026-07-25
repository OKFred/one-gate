/** admin app — i18n管理页面文案 */
export const i18n = {
  'translation.table.application': '应用',
  'translation.table.business': '业务',
  'translation.table.langCode': '语言代码',
  'translation.table.tKey': '翻译键',
  'translation.table.tValue': '翻译值',
  'translation.dialog.duplicateWarning': '发现{count}个相同的翻译文案：',
  'translation.dialog.duplicateSuggestion':
    '💡 建议：确认是否需要添加新的翻译文案，或复用现有翻译键',
  'region.table.alpha2Code': 'ISO两位代码',
  'region.table.alpha3Code': 'ISO三位代码',
  'region.table.numeric': '数字代码',
  'region.table.iso3166Independent': '是否ISO3166独立主权国家',
  'region.table.businessLanguages': '业务语言',
  'language.table.langCode': '语言代码',
  'language.table.nativeName': '本地名称',
} as const satisfies Record<string, string>;
