import { useState, useEffect, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type PermissionRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as PermissionAPI from '@/api/system/permission';
import { SYSTEM } from '@/hooks/usePermission';
import type { ListPermissionReq, ListAllPermissionRes } from '@/api/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

export interface PermissionExtraContext {
  allPermissions: ListAllPermissionRes;
}

export default function PermissionManagement() {
  const [allPermissions, setAllPermissions] = useState<ListAllPermissionRes>([]);

  useEffect(() => {
    // 异步拉取全部权限，供新增/编辑表单树级归属选择
    PermissionAPI.listAllFn({ data: {} })
      .then((res) => setAllPermissions(res.data.data || []))
      .catch(console.error);
  }, []);

  const extraContext = useMemo<PermissionExtraContext>(
    () => ({
      allPermissions,
    }),
    [allPermissions],
  );

  const config: SchemaCrudConfig<
    PermissionRes,
    FilterState,
    ListPermissionReq,
    PermissionExtraContext
  > = {
    titleKey: 'permission.title',
    apiKeyName: 'id',
    permissions: {
      add: [SYSTEM.PERMISSION.ADD],
      edit: [SYSTEM.PERMISSION.EDIT],
      delete: [SYSTEM.PERMISSION.DELETE],
    },
    api: {
      list: PermissionAPI.listFn,
      add: PermissionAPI.addFn,
      update: PermissionAPI.updateFn,
      delete: PermissionAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListPermissionReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
    },
    form: formConfig,
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
