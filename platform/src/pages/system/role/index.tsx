import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RoleRes } from './components/TheTable';
import RoleFormFields from './components/TheForm';
import schema from '@/assets/schemas/system.roleAddReq.json';
import * as RoleAPI from '@/api/system/role';
import { SYSTEM } from '@/hooks/usePermission';
import type { ListRoleReq } from '@/api/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export type RoleRecord = RoleRes & { selectedDeptIds?: number[] };

const DEFAULT_FORM: Partial<RoleRecord> = {
  name: '',
  remark: null,
  isEnabled: true,
  dataScope: 'self_only',
  customDeptIds: null,
  selectedDeptIds: [],
};

export default function RoleManagement() {
  const config: SchemaCrudConfig<RoleRecord, FilterState, ListRoleReq> = {
    titleKey: 'role.title',
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
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      afterOpen: (form, isEdit, row) => {
        if (isEdit && row) {
          let selectedDeptIds: number[] = [];
          if (row.customDeptIds) {
            try {
              selectedDeptIds = JSON.parse(row.customDeptIds);
            } catch {
              selectedDeptIds = [];
            }
          }
          return {
            ...form,
            ...row,
            selectedDeptIds,
          };
        }
        return {
          ...form,
          selectedDeptIds: [],
        };
      },
      beforeSubmit: (form) => ({
        ...form,
        customDeptIds:
          form.dataScope === 'custom' && form.selectedDeptIds
            ? JSON.stringify(form.selectedDeptIds)
            : null,
      }),
      renderForm: (form, setForm, _isMobile, t) => (
        <RoleFormFields
          form={form}
          setForm={setForm as unknown as Parameters<typeof RoleFormFields>[0]['setForm']}
          t={t}
        />
      ),
    },
  };

  return <SchemaCrudPage config={config} />;
}
