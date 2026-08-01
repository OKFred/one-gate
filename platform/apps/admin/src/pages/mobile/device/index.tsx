import { THIS_PERMISSION } from './constant';
import { useState, useEffect } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type DeviceRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as DeviceAPI from '@/api/admin/mobile/device';
import type { ListDeviceReq } from '@/api/admin/mobile/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { DeviceAppDrawer } from './components/DeviceAppDrawer';

export default function DevicePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenDrawer = (e: any) => {
      setCurrentClientId(e.detail.clientId);
      setDrawerOpen(true);
    };
    window.addEventListener('OPEN_DEVICE_APP_DRAWER', handleOpenDrawer);
    return () => window.removeEventListener('OPEN_DEVICE_APP_DRAWER', handleOpenDrawer);
  }, []);

  const config: SchemaCrudConfig<DeviceRes, FilterState, ListDeviceReq, unknown> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: DeviceAPI.listFn,
      add: DeviceAPI.addFn,
      update: DeviceAPI.updateFn,
      delete: DeviceAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          orderBy: filters.orderBy,
          descend: filters.descend,
        }) as ListDeviceReq,
    },
    table: {
      columns: tableConfig.columns,
      cardFields: () => [],
      actions: tableConfig.actions,
    },
    form: formConfig,
  };

  return (
    <>
      <SchemaCrudPage config={config} />
      <DeviceAppDrawer
        open={drawerOpen}
        clientId={currentClientId}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
