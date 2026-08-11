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
import { DeviceStatusDrawer } from './components/DeviceStatusDrawer';

interface DeviceDrawerEventDetail {
  id?: number;
  clientId: string;
}

/** 从浏览器事件中读取设备抽屉参数。 */
function drawerEventDetail(event: Event): DeviceDrawerEventDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) return null;
  const record = detail as Record<string, unknown>;
  if (typeof record.clientId !== 'string') return null;
  return {
    clientId: record.clientId,
    id: typeof record.id === 'number' ? record.id : undefined,
  };
}

export default function DevicePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<number | null>(null);

  useEffect(() => {
    const handleOpenDrawer = (event: Event) => {
      const detail = drawerEventDetail(event);
      if (!detail) return;
      setCurrentClientId(detail.clientId);
      setDrawerOpen(true);
    };
    const handleOpenStatusDrawer = (event: Event) => {
      const detail = drawerEventDetail(event);
      if (!detail?.id) return;
      setCurrentClientId(detail.clientId);
      setCurrentDeviceId(detail.id);
      setStatusDrawerOpen(true);
    };
    window.addEventListener('OPEN_DEVICE_APP_DRAWER', handleOpenDrawer);
    window.addEventListener('OPEN_DEVICE_STATUS_DRAWER', handleOpenStatusDrawer);
    return () => {
      window.removeEventListener('OPEN_DEVICE_APP_DRAWER', handleOpenDrawer);
      window.removeEventListener('OPEN_DEVICE_STATUS_DRAWER', handleOpenStatusDrawer);
    };
  }, []);

  const config: SchemaCrudConfig<DeviceRes, FilterState, ListDeviceReq, unknown> = {
    refreshIntervalMs: 30_000,
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
          onlineStatus: filters.onlineStatus || undefined,
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
      <DeviceStatusDrawer
        open={statusDrawerOpen}
        deviceId={currentDeviceId}
        clientId={currentClientId}
        onClose={() => setStatusDrawerOpen(false)}
      />
    </>
  );
}
