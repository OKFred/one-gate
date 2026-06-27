import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RoleRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as RoleAPI from '@/api/system/role';
import { SYSTEM } from '@/hooks/usePermission';
import type { ListRoleReq } from '@/api/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export type RoleRecord = RoleRes & { selectedDeptIds?: number[] };

export default function RoleManagement() {
  const config: SchemaCrudConfig<RoleRecord, FilterState, ListRoleReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [SYSTEM.ROLE.ADD],
      edit: [SYSTEM.ROLE.EDIT],
      delete: [SYSTEM.ROLE.DELETE],
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
