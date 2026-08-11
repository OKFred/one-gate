import dayjs from 'dayjs';
import { Chip, Tooltip, type ChipProps } from '@mui/material';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAsyncTaskReq, ListAsyncTaskRes } from '@/api/admin/mobile/type';
import type { FilterState } from './TheFilter';
import { TaskStatusChip } from './TaskStatusChip';

export type AsyncTaskRes = NonNullable<ListAsyncTaskRes['list']>[0];

const PRIORITY_COLORS = {
  HIGH: 'error',
  NORMAL: 'primary',
  LOW: 'default',
} satisfies Record<AsyncTaskRes['priority'], NonNullable<ChipProps['color']>>;

export const tableConfig: SchemaCrudConfig<AsyncTaskRes, FilterState, ListAsyncTaskReq>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('mobile.asyncTask.taskId'), render: (row) => row.taskId },
    { title: t('mobile.device.clientId'), render: (row) => row.clientId },
    { title: t('mobile.asyncTask.cat'), render: (row) => row.cat },
    {
      title: t('mobile.asyncTask.priority'),
      render: (row) => (
        <Chip label={row.priority} color={PRIORITY_COLORS[row.priority]} size="small" />
      ),
    },
    {
      title: t('mobile.asyncTask.preemptRunning'),
      render: (row) => (row.preemptRunning ? t('mobile.asyncTask.yes') : t('mobile.asyncTask.no')),
    },
    {
      title: t('status.label'),
      render: (row) => <TaskStatusChip status={row.status} />,
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
