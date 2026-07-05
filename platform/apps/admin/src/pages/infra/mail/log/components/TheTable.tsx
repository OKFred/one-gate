import { Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListMailLogReq, ListMailLogRes } from '@/api/infra/mail/type';
import type { FilterState } from './TheFilter';

export type LogRes = NonNullable<ListMailLogRes['list']>[0];

export interface TableExtraContext {
  openDetail: (row: LogRes) => void;
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '-';
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

const truncateText = (text?: string, maxLength = 30) => {
  if (!text) return '-';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export const tableConfig: SchemaCrudConfig<
  LogRes,
  FilterState,
  ListMailLogReq,
  TableExtraContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    {
      title: t('log.table.subject'),
      render: (row) => (
        <Tooltip title={row.title || ''}>
          <span>{truncateText(row.title, 30)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('log.table.recipient'),
      render: (row) => (
        <Tooltip title={row.mailTo || ''}>
          <span>{truncateText(row.mailTo, 25)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('log.table.sender'),
      render: (row) => (
        <Tooltip title={row.mailFrom || ''}>
          <span>{truncateText(row.mailFrom, 25)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('columns.status'),
      align: 'center',
      render: (row) =>
        row.sendStatus ? (
          <Chip icon={<SuccessIcon />} label={t('status.success')} color="success" size="small" />
        ) : (
          <Tooltip title={row.exceptionDetails || t('status.failure')}>
            <Chip icon={<ErrorIcon />} label={t('status.failure')} color="error" size="small" />
          </Tooltip>
        ),
    },
    {
      title: t('log.table.sendTime'),
      render: (row) => formatDate(row.createTimeUtc),
    },
    {
      title: t('column.remark'),
      render: (row) => row.remark || '-',
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => truncateText(row.title, 40) },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    {
      type: 'content',
      label: t('log.table.recipient'),
      render: (row) => row.mailTo,
    },
    {
      type: 'content',
      label: t('log.table.sender'),
      render: (row) => row.mailFrom,
    },
    {
      type: 'content',
      label: t('log.table.sendTime'),
      render: (row) => formatDate(row.createTimeUtc),
    },
    {
      type: 'content',
      label: t('column.remark'),
      render: (row) => row.remark || '-',
    },
    {
      type: 'tags',
      render: (row) =>
        row.sendStatus ? (
          <Chip icon={<SuccessIcon />} label={t('status.success')} color="success" size="small" />
        ) : (
          <Chip icon={<ErrorIcon />} label={t('status.failure')} color="error" size="small" />
        ),
    },
  ],

  actions: (_t, extraContext) => [
    {
      key: 'view',
      color: 'primary',
      icon: <VisibilityIcon />,
      onClick: (row) => {
        if (extraContext?.openDetail) {
          extraContext.openDetail(row);
        }
      },
    },
  ],
};
