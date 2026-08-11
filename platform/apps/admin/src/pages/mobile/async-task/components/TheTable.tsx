import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAsyncTaskReq, ListAsyncTaskRes } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';
import { Chip, Tooltip } from '@mui/material';

export type AsyncTaskRes = NonNullable<ListAsyncTaskRes['list']>[0];

export const tableConfig: SchemaCrudConfig<AsyncTaskRes, FilterState, ListAsyncTaskReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('mobile.asyncTask.taskId'), render: (row) => row.taskId },
    { title: t('mobile.device.clientId'), render: (row) => row.clientId },
    { title: t('mobile.asyncTask.cat'), render: (row) => row.cat },
    {
      title: t('mobile.asyncTask.priority'),
      render: (row) => {
        const colors = {
          HIGH: 'error',
          NORMAL: 'primary',
          LOW: 'default',
        } as const;
        return <Chip label={row.priority} color={colors[row.priority]} size="small" />;
      },
    },
    {
      title: t('mobile.asyncTask.preemptRunning'),
      render: (row) => (row.preemptRunning ? t('mobile.asyncTask.yes') : t('mobile.asyncTask.no')),
    },
    {
      title: t('status.label'),
      render: (row) => {
        const colorMap: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
          PENDING: 'warning',
          RUNNING: 'primary',
          SUCCESS: 'success',
          FAILURE: 'error',
          TIMEOUT: 'default',
          REJECTED: 'warning',
          CANCELLED: 'default',
        };
        return <Chip label={row.status} color={colorMap[row.status] || 'default'} size="small" />;
      },
    },
    {
      title: t('mobile.asyncTask.preemptedByTaskId'),
      render: (row) => row.preemptedByTaskId || '-',
    },
    {
      title: t('columns.createTime'),
      render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('mobile.asyncTask.resultMessage'),
      render: (row) => (
        <Tooltip title={row.resultMessage || ''}>
          <span>
            {row.resultMessage
              ? row.resultMessage.length > 20
                ? row.resultMessage.substring(0, 20) + '...'
                : row.resultMessage
              : '-'}
          </span>
        </Tooltip>
      ),
    },
    { title: t('column.remark'), render: (row) => row.remark || '-' },
  ],
  cardFields: () => [],
  actions: () => [],
};
