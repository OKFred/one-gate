import { Chip, type ChipProps } from '@mui/material';
import type { ListAsyncTaskRes } from '@/api/admin/mobile/type';

type AsyncTask = NonNullable<ListAsyncTaskRes['list']>[number];

export type TaskStatus = AsyncTask['status'];

interface TaskStatusChipProps {
  status: TaskStatus;
}

const TASK_STATUS_COLORS = {
  PENDING: 'warning',
  RUNNING: 'primary',
  SUCCESS: 'success',
  FAILURE: 'error',
  TIMEOUT: 'default',
  REJECTED: 'warning',
  CANCELLED: 'default',
} satisfies Record<TaskStatus, NonNullable<ChipProps['color']>>;

export function TaskStatusChip({ status }: TaskStatusChipProps) {
  return <Chip label={status} color={TASK_STATUS_COLORS[status]} size="small" />;
}
