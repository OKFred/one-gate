import { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { Visibility as ViewIcon } from '@mui/icons-material';
import * as CacheAPI from '@/api/infra/maintenance/cache';
import { THIS_PERMISSION } from '../constant';
import type { ListKeysRes } from '@/api/infra/maintenance/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import TheDetail from './components/TheDetail';

type CacheRow = NonNullable<ListKeysRes['keys']>[number];

export interface CacheContext {
  onPreview: (row: CacheRow) => void;
}

export default function CacheManagementPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState<CacheRow | null>(null);

  const extraContext = useMemo<CacheContext>(
    () => ({
      onPreview: (row) => {
        setPreviewRow(row);
        setPreviewOpen(true);
      },
    }),
    [],
  );

  const config: SchemaCrudConfig<CacheRow, { prefix: string }, { prefix?: string }, CacheContext> =
    {
      apiKeyName: 'name',
      permissions: {},
      api: {
        list: async (args) => {
          const prefix = args.data?.prefix || undefined;
          const res = await CacheAPI.listKeysFn({ data: { prefix, limit: 1000 } });
          const keysList = res.data?.data?.keys || [];
          return {
            data: {
              data: {
                list: keysList,
                total: keysList.length,
              },
            },
          } as unknown as ReturnType<
            NonNullable<
              SchemaCrudConfig<CacheRow, { prefix: string }, { prefix?: string }>['api']['list']
            >
          >;
        },
        delete: (args) => {
          return CacheAPI.deleteFn({ data: { key: String(args.data.id) } });
        },
      },
      filter: {
        defaultFilters: { prefix: '' },
        fields: (t) => [
          {
            name: 'prefix',
            label: t('cache.filter.keyPrefix'),
            type: 'text',
            placeholder: t('cache.filter.keyPrefixPlaceholder'),
            sx: { width: '100%' },
          },
        ],
        transformRequest: (filters) => ({
          prefix: filters.prefix || undefined,
        }),
      },
      table: {
        columns: (t) => [{ title: t('cache.columns.key'), render: (row) => row.name }],
        cardFields: (t) => [{ label: t('cache.columns.key'), render: (row) => row.name }],
        actions: (_, context) => [
          {
            key: 'view',
            color: 'info',
            icon: <ViewIcon />,
            permissionCodes: [THIS_PERMISSION.cache.view],
            onClick: (row) => {
              context?.onPreview(row);
            },
          },
        ],
      },
      form: {
        schema: { type: 'object' },
        defaultForm: {},
      },
    };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />

      <TheDetail
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRow(null);
        }}
        cacheKey={previewRow?.name || ''}
      />
    </>
  );
}
