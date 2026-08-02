import { THIS_PERMISSION } from './constant';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AppVersionRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as AppVersionAPI from '@/api/admin/mobile/app-version';
import type { ListAppVersionReq } from '@/api/admin/mobile/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { useEffect, useState } from 'react';

export default function AppVersionPage({ appId }: { appId?: number }) {
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilters, appId });

  useEffect(() => {
    if (appId !== undefined) {
      setFilters((prev) => ({ ...prev, appId }));
    }
  }, [appId]);

  const config: SchemaCrudConfig<AppVersionRes, FilterState, ListAppVersionReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: AppVersionAPI.listFn,
      add: AppVersionAPI.addFn,
      update: AppVersionAPI.updateFn,
      delete: AppVersionAPI.deleteFn,
    },
    filter: {
      defaultFilters: filters,
      fields: filterConfig.fields,
      transformRequest: (f) =>
        ({
          appId: f.appId,
          keyword: f.keyword || undefined,
          orderBy: f.orderBy,
          descend: f.descend,
        }) as ListAppVersionReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: () => [],
      actions: tableConfig.actions,
    },
    form: {
      ...formConfig,
      defaultForm: {
        ...formConfig.defaultForm,
        appId: appId || 0,
      },
    },
  };

  return <SchemaCrudPage config={config} />;
}
