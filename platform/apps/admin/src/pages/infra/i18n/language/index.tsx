import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type LanguageRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as LanguageAPI from '@/api/infra/i18n/language';
import type { ListLanguageReq } from '@/api/infra/i18n/type';
import { infra_i18n } from '@/hooks/usePermission';

export default function LanguagePage() {
  const config: SchemaCrudConfig<LanguageRes, FilterState, ListLanguageReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [infra_i18n.language.add],
      edit: [infra_i18n.language.edit],
      delete: [infra_i18n.language.delete],
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
