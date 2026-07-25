export const i18n = {
  'translation.table.application': 'Application',
  'translation.table.business': 'Business',
  'translation.table.langCode': 'Language Code',
  'translation.table.tKey': 'Translation Key',
  'translation.table.tValue': 'Translation Value',
  'translation.dialog.duplicateWarning': 'Found {count} duplicated translation(s):',
  'translation.dialog.duplicateSuggestion':
    'Tip: Consider reusing an existing key instead of adding a new translation.',
  'region.table.alpha2Code': 'ISO 3166-1 alpha-2',
  'region.table.alpha3Code': 'ISO 3166-1 alpha-3',
  'region.table.numeric': 'Numeric Code',
  'region.table.iso3166Independent': 'Is Independent Country / Region in ISO3166',
  'region.table.businessLanguages': 'Business Languages',
  'language.table.langCode': 'Language Code',
  'language.table.nativeName': 'Native Name',
} as const satisfies Record<string, string>;
