import { SchemaCrudPage } from '@/components/Crud';
import dayjs from 'dayjs';
import * as auditLoginAPI from '@/api/admin/maintenance/auditLogin';
import type { ListLoginAuditRes, ListLoginAuditReq } from '@/api/admin/maintenance/type';
import type { SchemaCrudConfig } from '@/components/Crud';

type AuditLogRow = NonNullable<ListLoginAuditRes['list']>[number];

export default function AuditLoginPage() {
  const config: SchemaCrudConfig<
    AuditLogRow,
    { userId?: number; orderBy: string; descend: boolean },
    ListLoginAuditReq
  > = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: auditLoginAPI.listFn,
    },
    filter: {
      defaultFilters: {
        userId: undefined,
        orderBy: 'id',
        descend: true,
      },
      fields: (t) => [
        {
          name: 'userId',
          label: t('maintenance.auditLogin.column.userId'),
          type: 'text',
          placeholder: t('maintenance.auditLogin.column.userId'),
        },
        {
          name: 'orderBy',
          label: t('filter.orderBy'),
          type: 'select',
          options: [
            { value: 'id', label: t('columns.id') },
            { value: 'userId', label: t('maintenance.auditLogin.column.userId') },
            { value: 'loginTimeUtc', label: t('maintenance.auditLogin.column.loginTime') },
            { value: 'createTimeUtc', label: t('columns.createTime') },
          ],
        },
        {
          name: 'descend',
          label: t('filter.sortOrder'),
          type: 'select',
          options: [
            { value: true, label: t('filter.desc') },
            { value: false, label: t('filter.asc') },
          ],
        },
      ],
      transformRequest: (filters) =>
        ({
          userId: filters.userId ? Number(filters.userId) : undefined,
          orderBy: filters.orderBy as ListLoginAuditReq['orderBy'],
          descend: filters.descend,
        }) as ListLoginAuditReq,
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('maintenance.auditLogin.column.userId'), render: (row) => row.userId },
        {
          title: t('maintenance.auditLogin.column.loginTime'),
          render: (row) =>
            row.loginTimeUtc ? dayjs(row.loginTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        { title: t('maintenance.auditLogin.column.ip'), render: (row) => row.ip || '-' },
        {
          title: t('maintenance.auditLogin.column.userAgent'),
          render: (row) => (
            <div
              style={{
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.userAgent || '-'}
            </div>
          ),
        },
        { title: t('column.remark'), render: (row) => row.remark || '-' },
        {
          title: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => `User ID: ${row.userId}` },
        { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
        {
          type: 'content',
          label: t('maintenance.auditLogin.column.loginTime'),
          render: (row) =>
            row.loginTimeUtc ? dayjs(row.loginTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
          type: 'content',
          label: t('maintenance.auditLogin.column.ip'),
          render: (row) => row.ip || '-',
        },
        {
          type: 'content',
          label: t('maintenance.auditLogin.column.userAgent'),
          render: (row) => row.userAgent || '-',
        },
      ],
    },
    form: {
      schema: { type: 'object' },
      defaultForm: {},
    },
  };

  return <SchemaCrudPage config={config} />;
}
