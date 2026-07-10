import { THIS_PERMISSION } from './constant';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RoleRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as RoleAPI from '@/api/infra/system/role';
import type { ListRoleReq } from '@/api/infra/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export type RoleRecord = RoleRes & { selectedDeptIds?: number[] };

export default function RoleManagement() {
  const config: SchemaCrudConfig<RoleRecord, FilterState, ListRoleReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: RoleAPI.listFn,
      add: RoleAPI.addFn,
      update: RoleAPI.updateFn,
      delete: RoleAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListRoleReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
    },
    form: formConfig,
  };

  return <SchemaCrudPage config={config} />;
}
