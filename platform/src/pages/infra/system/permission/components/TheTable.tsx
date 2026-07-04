import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListPermissionReq, ListPermissionRes } from '@/api/infra/system/type';
import type { FilterState } from './TheFilter';

export type PermissionRes = NonNullable<ListPermissionRes['list']>[0];

export const tableConfig: SchemaCrudConfig<PermissionRes, FilterState, ListPermissionReq>['table'] =
  {
    columns: (t) => [
      { title: t('columns.id'), render: (row) => row.id },
      { title: t('permission.code'), render: (row) => row.code },
      { title: t('permission.name'), render: (row) => row.name },
      {
        title: t('permission.category'),
        render: (row) => {
          const map: Record<string, string> = {
            menu: t('permission.category.menu'),
            button: t('permission.category.button'),
            api: t('permission.category.api'),
            action: t('permission.category.action'),
          };
          return map[row.category] || row.category;
        },
      },
      { title: t('permission.resource'), render: (row) => row.resource || '--' },
      { title: t('permission.business'), render: (row) => row.business || '--' },
      {
        title: t('status.enabled'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        title: t('columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
      },
    ],

    cardFields: (t) => [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', label: t('permission.code'), render: (row) => row.code },
      {
        type: 'content',
        label: t('permission.category'),
        render: (row) => {
          const map: Record<string, string> = {
            menu: t('permission.category.menu'),
            button: t('permission.category.button'),
            api: t('permission.category.api'),
            action: t('permission.category.action'),
          };
          return map[row.category] || row.category;
        },
      },
      { type: 'content', label: t('permission.resource'), render: (row) => row.resource || '--' },
      { type: 'content', label: t('permission.business'), render: (row) => row.business || '--' },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
          />
        ),
      },
    ],
  };
