import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListConfigReq, ListConfigRes } from '@/api/infra/data/oss/type';
import type { FilterState } from './TheFilter';

export type ConfigRes = NonNullable<ListConfigRes['list']>[0];

export const tableConfig: SchemaCrudConfig<ConfigRes, FilterState, ListConfigReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('oss.config.name'), render: (row) => row.name },
    { title: t('oss.config.provider'), render: (row) => row.provider },
    { title: t('oss.config.bucket'), render: (row) => row.bucket },
    {
      title: t('oss.config.isDefault'),
      render: (row) =>
        row.isDefault ? (
          <Chip label={t('oss.config.isDefault')} color="primary" size="small" variant="outlined" />
        ) : (
          '-'
        ),
    },
    {
      title: t('status.enabled'),
      render: (row) => (
        <Chip
          label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
          color={row.isEnabled ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      title: t('columns.createTime'),
      render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.name },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    { type: 'content', label: t('oss.config.provider'), render: (row) => row.provider },
    { type: 'content', label: t('oss.config.bucket'), render: (row) => row.bucket },
    {
      type: 'tags',
      render: (row) => (
        <>
          {row.isDefault && <Chip label={t('oss.config.isDefault')} color="primary" size="small" />}
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'default'}
            size="small"
          />
        </>
      ),
    },
  ],
};
