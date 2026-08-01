import { THIS_PERMISSION } from '../constant';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListDeviceReq, ListDeviceRes } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';
import AppsIcon from '@mui/icons-material/Apps';

export type DeviceRes = NonNullable<ListDeviceRes['list']>[0];

export const tableConfig: SchemaCrudConfig<
  DeviceRes,
  FilterState,
  ListDeviceReq,
  unknown
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('mobile.device.clientId'), render: (row) => row.clientId },
    { title: t('mobile.device.deviceName'), render: (row) => row.deviceName || '-' },
    {
      title: t('status.enabled'),
      render: (row) => (row.isEnabled ? t('status.enabled') : t('status.disabled')),
    },
    {
      title: t('columns.createTime'),
      render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
    },
    { title: t('column.remark'), render: (row) => row.remark || '-' },
  ],
  cardFields: () => [],
  actions: (t) => [
    {
      key: 'apps',
      label: t('mobile.deviceApp.title'),
      icon: <AppsIcon fontSize="small" />,
      color: 'primary',
      permissionCodes: [THIS_PERMISSION.read],
      onClick: (row) => {
        window.dispatchEvent(
          new CustomEvent('OPEN_DEVICE_APP_DRAWER', { detail: { clientId: row.clientId } }),
        );
      },
    },
  ],
};
