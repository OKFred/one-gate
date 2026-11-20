import { useState } from 'react';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { adminMaintenanceCacheContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { permissions } from '@/hooks/usePermission';
import * as CacheAPI from '@/api/admin/maintenance/cache';
import type { ListKeysRes } from '@/api/admin/maintenance/type';
import TheDetail from './components/TheDetail';

type CacheRow = NonNullable<ListKeysRes['keys']>[number] & Record<string, unknown>;

export default function CacheManagementPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<CacheRow | null>(null);

  const extensions: CrudExtensions<CacheRow> = {
    listAdapter: async (args) => {
      const prefix =
        typeof args.data?.prefix === 'string' && args.data.prefix ? args.data.prefix : undefined;
      const res = await CacheAPI.listKeysFn({
        data: { prefix, limit: 1000 },
        errorPresentation: args.errorPresentation,
      });
      const keysList = (res.data?.data?.keys ?? []) as CacheRow[];
      return {
        data: {
          ok: true,
          data: {
            list: keysList,
            total: keysList.length,
          },
        },
      };
    },
    mutationAdapter: {
      delete: (args) => CacheAPI.deleteFn({ data: { key: String(args.data.id) } }),
    },
    rowActions: () => [
      {
        key: 'view',
        color: 'info',
        icon: <ViewIcon />,
        permissionCodes: [permissions.admin.maintenance.cache.view],
        onClick: (row) => {
          setPreviewRow(row);
          setPreviewOpen(true);
        },
      },
    ],
    dialogs: () => (
      <TheDetail
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRow(null);
        }}
        cacheKey={previewRow?.name || ''}
      />
    ),
  };

  return <ContractCrudPage contract={adminMaintenanceCacheContract} extensions={extensions} />;
}
