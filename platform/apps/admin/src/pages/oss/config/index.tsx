import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type ConfigRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as OSSConfigAPI from '@/api/admin/oss/config';
import type { ListConfigReq } from '@/api/admin/oss/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export default function OSSConfigPage() {
  const config: SchemaCrudConfig<ConfigRes, FilterState, ListConfigReq> = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: OSSConfigAPI.listFn,
      add: OSSConfigAPI.addFn,
      update: OSSConfigAPI.updateFn,
      delete: OSSConfigAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListConfigReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
    },
    form: formConfig,
  };

  return <SchemaCrudPage config={config} />;
}
