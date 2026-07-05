import { Chip, CircularProgress } from '@mui/material';
import { QuestionMark as VerifyIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListMailAccountReq, ListMailAccountRes } from '@/api/infra/mail/type';
import type { FilterState } from './TheFilter';
import { MAIL } from '@/hooks/usePermission';

export type AccountRes = NonNullable<ListMailAccountRes['list']>[0];

export interface TableExtraContext {
  verifyingId: number | null;
  handleVerify: (id: number) => Promise<void>;
}

export const tableConfig: SchemaCrudConfig<
  AccountRes,
  FilterState,
  ListMailAccountReq,
  TableExtraContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('account.table.nickname'), render: (row) => row.nickname },
    { title: t('account.table.email'), render: (row) => row.mailAddress },
    { title: t('account.table.host'), render: (row) => row.host },
    { title: t('account.table.port'), render: (row) => row.port },
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
    { type: 'title', render: (row) => row.nickname },
    { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
    { type: 'content', label: t('account.table.email'), render: (row) => row.mailAddress },
    {
      type: 'content',
      label: t('account.table.host') + ':' + t('account.table.port'),
      render: (row) => `${row.host}:${row.port}`,
    },
    {
      type: 'content',
      label: t('column.remark'),
      render: (row) => row.remark || '-',
    },
    {
      type: 'tags',
      render: (row) => <Chip label={row.port} color="success" size="small" />,
    },
  ],

  actions: (_t, extraContext) => [
    {
      key: 'verify',
      color: 'success',
      permissionCodes: [MAIL.ACCOUNT.EDIT],
      icon: (row) => {
        const isVerifying = extraContext?.verifyingId === row.id;
        return isVerifying ? <CircularProgress size={20} color="inherit" /> : <VerifyIcon />;
      },
      disabled: (row) => {
        return extraContext?.verifyingId === row.id;
      },
      onClick: async (row) => {
        if (row.id && extraContext?.handleVerify) {
          await extraContext.handleVerify(row.id);
        }
      },
    },
  ],
};
