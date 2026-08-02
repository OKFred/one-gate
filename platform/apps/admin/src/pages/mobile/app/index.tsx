import { THIS_PERMISSION } from './constant';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AppRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as AppAPI from '@/api/admin/mobile/app';
import type { ListAppReq } from '@/api/admin/mobile/type';
import type { SchemaCrudConfig } from '@/components/Crud';

import { useState } from 'react';
import AppVersionDrawer from './components/AppVersionDrawer';
import SettingsIcon from '@mui/icons-material/Settings';

export default function AppPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentAppId, setCurrentAppId] = useState<number | null>(null);
  const [currentAppName, setCurrentAppName] = useState('');

  const config: SchemaCrudConfig<AppRes, FilterState, ListAppReq> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: AppAPI.listFn,
      add: AppAPI.addFn,
      update: AppAPI.updateFn,
      delete: AppAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          orderBy: filters.orderBy,
          descend: filters.descend,
        }) as ListAppReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: () => [],
      actions: () => [
        {
          key: 'versions',
          label: 'Versions',
          icon: <SettingsIcon fontSize="small" />,
          onClick: (row) => {
            setCurrentAppId(row.id);
            setCurrentAppName(row.name);
            setDrawerOpen(true);
          },
        },
      ],
    },
    form: formConfig,
  };

  return (
    <>
      <SchemaCrudPage config={config} />
      <AppVersionDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setCurrentAppId(null);
        }}
        appId={currentAppId}
        appName={currentAppName}
      />
    </>
  );
}
