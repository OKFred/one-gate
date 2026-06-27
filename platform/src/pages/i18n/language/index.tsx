import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type LanguageRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as LanguageAPI from '@/api/i18n/language';
import type { ListLanguageReq } from '@/api/i18n/type';
import { I18N } from '@/hooks/usePermission';

export default function LanguagePage() {
  const config: SchemaCrudConfig<LanguageRes, FilterState, ListLanguageReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [I18N.LANGUAGE.ADD],
      edit: [I18N.LANGUAGE.EDIT],
      delete: [I18N.LANGUAGE.DELETE],
    },
    api: {
      list: LanguageAPI.listFn,
      add: LanguageAPI.addFn,
      update: LanguageAPI.updateFn,
      delete: LanguageAPI.deleteFn,
    },
    filter: filterConfig,
    table: tableConfig,
    form: formConfig,
  };

  return <SchemaCrudPage config={config} />;
}
