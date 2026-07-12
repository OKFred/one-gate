import { THIS_PERMISSION } from './constant';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type LanguageRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as LanguageAPI from '@/api/admin/i18n/language';
import type { ListLanguageReq } from '@/api/admin/i18n/type';

export default function LanguagePage() {
  const config: SchemaCrudConfig<LanguageRes, FilterState, ListLanguageReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
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
