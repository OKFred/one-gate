import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListDeviceAppRes, ListDeviceAppReq } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';
import dayjs from 'dayjs';

export type DeviceAppRes = NonNullable<ListDeviceAppRes['list']>[0];

export const tableConfig: SchemaCrudConfig<DeviceAppRes, FilterState, ListDeviceAppReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('mobile.device.clientId'), render: (row) => row.clientId },
    {
      title: 'App',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(row as any).appIconUrl && (
            <img
              src={(row as any).appIconUrl}
              style={{ width: 32, height: 32, borderRadius: 4 }}
              alt=""
            />
          )}
          <div>
            <div>{(row as any).appName || (row as any).appPackageName || row.appId}</div>
            <div style={{ fontSize: 12, color: 'gray' }}>{(row as any).appPackageName}</div>
          </div>
        </div>
      ),
    },
    {
      title: t('mobile.deviceApp.installedVersionName'),
      render: (row) => row.installedVersionName,
    },
    {
      title: t('mobile.deviceApp.installedVersionCode'),
      render: (row) => row.installedVersionCode,
    },
    { title: t('mobile.deviceApp.installStatus'), render: (row) => row.installStatus },
    {
      title: t('mobile.deviceApp.lastSyncTimeUtc'),
      render: (row) =>
        row.lastSyncTimeUtc ? dayjs(row.lastSyncTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ],
  cardFields: () => [],
  actions: () => [],
};
