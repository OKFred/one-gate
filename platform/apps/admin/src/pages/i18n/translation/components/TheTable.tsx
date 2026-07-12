import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListTranslationReq, ListTranslationRes } from '@/api/admin/i18n/type';

export type TranslationRes = NonNullable<ListTranslationRes['list']>[0];
import type { FilterState } from './TheFilter';

export const tableConfig: SchemaCrudConfig<
  TranslationRes,
  FilterState,
  ListTranslationReq
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    {
      title: t('translation.table.application'),
      render: (row) => (
        <Chip label={row.application} size="small" color="primary" variant="outlined" />
      ),
    },
    {
      title: t('translation.table.business'),
      render: (row) => (
        <Chip label={row.business} size="small" color="secondary" variant="outlined" />
      ),
    },
    {
      title: t('translation.table.langCode'),
      render: (row) => <Chip label={row.langCode} size="small" variant="outlined" />,
    },
    { title: t('translation.table.tKey'), render: (row) => row.tKey },
    { title: t('translation.table.tValue'), render: (row) => row.tValue },
    {
      title: t('filter.enabledStatus'),
      render: (row) => (
        <Chip
          label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
          size="small"
          color={row.isEnabled ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      title: t('columns.createTime'),
      render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('column.remark'),
      render: (row) => row.remark || '-',
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.tKey },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    { type: 'content', label: t('translation.table.tValue'), render: (row) => row.tValue },
    {
      type: 'tags',
      render: (row) => (
        <>
          <Chip label={row.application} size="small" color="primary" variant="outlined" />
          <Chip label={row.business} size="small" color="secondary" variant="outlined" />
          <Chip label={row.langCode} size="small" variant="outlined" />
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            size="small"
            color={row.isEnabled ? 'success' : 'default'}
            variant="outlined"
          />
        </>
      ),
    },
    {
      type: 'content',
      label: t('column.remark'),
      render: (row) => row.remark || '-',
    },
  ],
};
