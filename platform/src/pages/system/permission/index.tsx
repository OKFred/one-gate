import { useState, useEffect } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type PermissionRes } from './components/TheTable';
import PermissionFormFields from './components/TheForm';
import schema from '@/assets/schemas/system.permissionAddReq.json';
import * as PermissionAPI from '@/api/system/permission';
import { SYSTEM } from '@/hooks/usePermission';
import type { ListPermissionReq, ListAllPermissionRes } from '@/api/system/type';
import type { SchemaCrudConfig } from '@/components/Crud';

const DEFAULT_FORM: Partial<PermissionRes> = {
  code: '',
  name: '',
  category: 'action',
  resource: '',
  business: null,
  remark: null,
  isEnabled: true,
};

export default function PermissionManagement() {
  const [allPermissions, setAllPermissions] = useState<ListAllPermissionRes>([]);

  useEffect(() => {
    // 异步拉取全部权限，供新增/编辑表单树级归属选择
    PermissionAPI.listAllFn({ data: {} })
      .then((res) => setAllPermissions(res.data.data || []))
      .catch(console.error);
  }, []);

  const config: SchemaCrudConfig<PermissionRes, FilterState, ListPermissionReq> = {
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
    form: {
      schema,
      defaultForm: DEFAULT_FORM,
      renderForm: (form, setForm, _isMobile, t) => (
        <PermissionFormFields form={form} setForm={setForm} allPermissions={allPermissions} t={t} />
      ),
    },
  };

  return <SchemaCrudPage config={config} />;
}
