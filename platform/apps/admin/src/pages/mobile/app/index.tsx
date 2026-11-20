import { useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { adminMobileAppContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import type { ListAppRes } from '@/api/admin/mobile/type';
import AppVersionDrawer from './components/AppVersionDrawer';

type AppRow = NonNullable<ListAppRes['list']>[number] & Record<string, unknown>;

export default function AppPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentAppId, setCurrentAppId] = useState<number | null>(null);
  const [currentAppName, setCurrentAppName] = useState('');

  const extensions: CrudExtensions<AppRow> = {
    rowActions: () => [
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
    dialogs: () => (
      <AppVersionDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setCurrentAppId(null);
        }}
        appId={currentAppId}
        appName={currentAppName}
      />
    ),
  };

  return <ContractCrudPage contract={adminMobileAppContract} extensions={extensions} />;
}
