import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListLanguageReq, ListLanguageRes } from '@/api/i18n/type';

export type LanguageRes = NonNullable<ListLanguageRes['list']>[0];
import type { FilterState } from './TheFilter';

export const tableConfig: SchemaCrudConfig<LanguageRes, FilterState, ListLanguageReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('language.table.langCode'), render: (row) => row.langCode },
    { title: t('language.table.nativeName'), render: (row) => row.nativeName || '-' },
    { title: t('filter.sortOrder'), render: (row) => row.sortOrder },
    {
      title: t('filter.enabledStatus'),
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
    {
      title: t('column.remark'),
      render: (row) => row.remark || '-',
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.nativeName || row.langCode },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    { type: 'content', label: t('language.table.langCode'), render: (row) => row.langCode },
    {
      type: 'content',
      label: t('filter.sortOrder'),
      render: (row) => row.sortOrder,
    },
    {
      type: 'content',
      label: t('column.remark'),
      render: (row) => row.remark || '-',
    },
    {
      type: 'tags',
      render: (row) => (
        <Chip
          label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
          color={row.isEnabled ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      ),
    },
  ],
};
