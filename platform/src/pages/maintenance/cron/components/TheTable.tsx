import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { CronObj, ListCronReq } from '@/api/maintenance/type';
import type { FilterState } from './TheFilter';

export const tableConfig: SchemaCrudConfig<CronObj, FilterState, ListCronReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('cron.field.name'), render: (row) => row.name },
    { title: t('cron.field.jobKey'), render: (row) => row.jobKey },
    { title: t('cron.field.cronExpression'), render: (row) => row.cronExpression },
    {
      title: t('filter.enabledStatus'),
      render: (row) => (
        <Chip
          label={row.status ? t('status.enabled') : t('status.disabled')}
          color={row.status ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      ),
    },
    { title: t('cron.field.runCount'), render: (row) => row.runCount },
    {
      title: t('cron.field.lastRunTime'),
      render: (row) =>
        row.lastRunTimeUtc ? dayjs(row.lastRunTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: t('cron.field.nextRunTime'),
      render: (row) =>
        row.nextRunTimeUtc && row.status
          ? dayjs(row.nextRunTimeUtc).format('YYYY-MM-DD HH:mm:ss')
          : '-',
    },
  ],
  cardFields: (t) => [
    { type: 'title', render: (row) => row.name },
    { type: 'subtitle', label: 'Key', render: (row) => row.jobKey },
    { type: 'content', label: 'Cron', render: (row) => row.cronExpression },
    { type: 'content', label: t('cron.field.runCount'), render: (row) => row.runCount },
    {
      type: 'tags',
      render: (row) => (
        <Chip
          label={row.status ? t('status.enabled') : t('status.disabled')}
          color={row.status ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      ),
    },
  ],
};
