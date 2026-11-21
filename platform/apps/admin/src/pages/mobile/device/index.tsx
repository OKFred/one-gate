import { useEffect, useState } from 'react';
import AppsIcon from '@mui/icons-material/Apps';
import DevicesIcon from '@mui/icons-material/Devices';
import { Stack, Typography } from '@mui/material';
import { adminMobileDeviceContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { permissions } from '@/hooks/usePermission';
import type { ListDeviceRes } from '@/api/admin/mobile/type';
import { DeviceAppDrawer } from './components/DeviceAppDrawer';
import { DeviceStatusDrawer } from './components/DeviceStatusDrawer';

type DeviceRow = NonNullable<ListDeviceRes['list']>[number] & Record<string, unknown>;

interface DeviceStatusDrawerEventDetail {
  id: number;
  clientId: string;
}

function parseStatusDrawerEventDetail(event: Event): DeviceStatusDrawerEventDetail | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null) return null;
  const record = detail as Record<string, unknown>;
  if (typeof record.clientId !== 'string' || typeof record.id !== 'number') return null;
  return { id: record.id, clientId: record.clientId };
}

export default function DevicePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<number | null>(null);

  // 兼容 E2E 抽屉打开状态下切换设备事件（device-tasks.spec.ts）
  useEffect(() => {
    const handleOpenStatusDrawer = (event: Event) => {
      const detail = parseStatusDrawerEventDetail(event);
      if (!detail) return;
      setCurrentClientId(detail.clientId);
      setCurrentDeviceId(detail.id);
      setStatusDrawerOpen(true);
    };
    window.addEventListener('OPEN_DEVICE_STATUS_DRAWER', handleOpenStatusDrawer);
    return () => {
      window.removeEventListener('OPEN_DEVICE_STATUS_DRAWER', handleOpenStatusDrawer);
    };
  }, []);

  const extensions: CrudExtensions<DeviceRow> = {
    customCells: {
      deviceName: (row) => (
        <Stack>
          <Typography variant="body2">{row.deviceName || row.model || '-'}</Typography>
          <Typography variant="caption" color="text.secondary">
            Android {row.androidVersion || '-'} / SDK {row.androidSdk ?? '-'}
          </Typography>
        </Stack>
      ),
      batteryLevel: (row) => (row.batteryLevel === null ? '-' : `${row.batteryLevel}%`),
      networkType: (row, translate) =>
        row.networkType || (row.networkConnected ? translate('status.online') : '-'),
    },
    rowActions: (translate) => [
      {
        key: 'status',
        label: translate('mobile.device.statusDrawer'),
        icon: (
          <DevicesIcon fontSize="small" titleAccess={translate('mobile.device.statusDrawer')} />
        ),
        color: 'success',
        permissionCodes: [permissions.admin.mobile.device.read],
        onClick: (row) => {
          setCurrentClientId(row.clientId);
          setCurrentDeviceId(row.id);
          setStatusDrawerOpen(true);
        },
      },
      {
        key: 'apps',
        label: translate('mobile.deviceApp.title'),
        icon: <AppsIcon fontSize="small" />,
        color: 'primary',
        permissionCodes: [permissions.admin.mobile.device.read],
        onClick: (row) => {
          setCurrentClientId(row.clientId);
          setDrawerOpen(true);
        },
      },
    ],
    dialogs: () => (
      <>
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
    ),
  };

  return <ContractCrudPage contract={adminMobileDeviceContract} extensions={extensions} />;
}
