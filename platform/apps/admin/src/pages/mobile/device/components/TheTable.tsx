import { THIS_PERMISSION } from '../constant';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListDeviceReq, ListDeviceRes } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';
import AppsIcon from '@mui/icons-material/Apps';
import DevicesIcon from '@mui/icons-material/Devices';
import { Chip, Stack, Typography } from '@mui/material';

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
    {
      title: t('mobile.device.onlineStatus'),
      render: (row) => (
        <Chip
          size="small"
          color={row.isOnline ? 'success' : 'default'}
          label={row.isOnline ? t('status.online') : t('status.offline')}
        />
      ),
    },
    {
      title: t('mobile.device.hardware'),
      render: (row) => (
        <Stack>
          <Typography variant="body2">{row.deviceName || row.model || '-'}</Typography>
          <Typography variant="caption" color="text.secondary">
            Android {row.androidVersion || '-'} / SDK {row.androidSdk ?? '-'}
          </Typography>
        </Stack>
      ),
    },
    {
      title: t('mobile.device.clientVersions'),
      render: (row) => row.clientVersion || '-',
    },
    {
      title: t('mobile.device.battery'),
      render: (row) => (row.batteryLevel === null ? '-' : `${row.batteryLevel}%`),
    },
    {
      title: t('mobile.device.network'),
      render: (row) => row.networkType || (row.networkConnected ? t('status.online') : '-'),
    },
    {
      title: t('mobile.device.lastHeartbeat'),
      render: (row) =>
        row.lastHeartbeatTimeUtc
          ? dayjs(row.lastHeartbeatTimeUtc).format('YYYY-MM-DD HH:mm:ss')
          : '-',
    },
    { title: t('column.remark'), render: (row) => row.remark || '-' },
  ],
  cardFields: () => [],
  actions: (t) => [
    {
      key: 'status',
      label: t('mobile.device.statusDrawer'),
      icon: <DevicesIcon fontSize="small" />,
      color: 'success',
      permissionCodes: [THIS_PERMISSION.read],
      onClick: (row) => {
        window.dispatchEvent(
          new CustomEvent('OPEN_DEVICE_STATUS_DRAWER', {
            detail: { id: row.id, clientId: row.clientId },
          }),
        );
      },
    },
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
