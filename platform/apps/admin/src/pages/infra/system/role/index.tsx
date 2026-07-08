import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RoleRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as RoleAPI from '@/api/infra/system/role';
import { infra_system } from '@/hooks/usePermission';
import type { ListRoleReq } from '@/api/infra/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export type RoleRecord = RoleRes & { selectedDeptIds?: number[] };

export default function RoleManagement() {
  const config: SchemaCrudConfig<RoleRecord, FilterState, ListRoleReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [infra_system.role.add],
      edit: [infra_system.role.edit],
      delete: [infra_system.role.delete],
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
