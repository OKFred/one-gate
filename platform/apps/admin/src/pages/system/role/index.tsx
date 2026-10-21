import { THIS_PERMISSION } from './constant';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type RoleRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as RoleAPI from '@/api/admin/system/role';
import type { ListRoleReq } from '@/api/admin/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { useRef } from 'react';
import { permissions, usePermission } from '@/hooks/usePermission';

export type RoleRecord = RoleRes & { selectedDeptIds?: number[] };

export default function RoleManagement() {
  const permissionState = usePermission();
  const permissionRef = useRef(permissionState);
  permissionRef.current = permissionState;
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
    softDelete: {
      resourceType: 'role',
      displayName: (row) => row.name,
      expectedUpdateTimeUtc: (row) => row.updateTimeUtc ?? null,
      confirmationContent: (_row, t) => t('role.dialog.softDeleteConfirm'),
      delete: RoleAPI.deleteWithUndoFn,
      canOpenRecycleBin: () =>
        permissionRef.current.hasAllPermissions([
          permissions.admin.maintenance.recycle_bin.read,
          permissions.admin.maintenance.recycle_bin.restore,
          permissions.admin.system.role.read,
          permissions.admin.system.role.edit,
        ]),
      verifyCurrent: async (row) => {
        if (!permissionRef.current.hasAllPermissions([permissions.admin.system.role.read]))
          return null;
        try {
          const response = await RoleAPI.getFn({
            data: { id: row.id },
            errorPresentation: 'local',
          });
          return response.data?.ok === true && response.data.data?.id === row.id ? true : null;
        } catch {
          return null;
        }
      },
      retryableErrorCodes: [
        'errorHandler.role.nameConflict',
        'errorHandler.role.departmentsUnavailable',
      ],
      stateChangedErrorCodes: [
        'errorHandler.role.staleDeletion',
        'errorHandler.role.notDeleted',
        'errorHandler.role.stateConflict',
      ],
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
