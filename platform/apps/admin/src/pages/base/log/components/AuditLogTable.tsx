import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as LogAPI from '@/api/admin/base/log';
import type { AuditListReq, AuditListRes } from '@/api/admin/base/log';
import dayjs from 'dayjs';

type AuditRecord = AuditListRes['list'][0];

export default function AuditLogTable() {
  const config: SchemaCrudConfig<AuditRecord, any, AuditListReq> = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: LogAPI.auditList,
    },
    filter: {
      defaultFilters: {},
      fields: (t) => [
        { name: 'namespace', label: t('log.namespace'), type: 'text' },
      ],
      transformRequest: (filters) => ({
        namespace: filters.namespace || undefined,
      } as AuditListReq),
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('log.namespace'), render: (row) => row.namespace },
        { title: t('table.actions'), render: (row) => row.action },
        { title: t('columns.createTime'), render: (row) => row.createTimeUtc ? dayjs(row.createTimeUtc).format("YYYY-MM-DD HH:mm:ss") : '--' },
        { title: t('column.creatorName'), render: (row) => row.creatorName },
        { title: t('log.beforeData'), render: (row) => JSON.stringify(row.beforeData) },
        { title: t('log.afterData'), render: (row) => JSON.stringify(row.afterData) },
      ],
      cardFields: () => [],
    },
    form: { fields: () => [] } as any,
  };

  return <SchemaCrudPage config={config} />;
}
