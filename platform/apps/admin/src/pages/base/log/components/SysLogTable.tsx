import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as LogAPI from '@/api/admin/base/log';
import type { SysListReq, SysListRes } from '@/api/admin/base/log';
import dayjs from 'dayjs';

type SysRecord = SysListRes['list'][0];

export default function SysLogTable() {
  const config: SchemaCrudConfig<SysRecord, any, SysListReq> = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: LogAPI.sysList,
    },
    filter: {
      defaultFilters: {},
      fields: (t) => [{ name: 'namespace', label: t('log.namespace'), type: 'text' }],
      transformRequest: (filters) =>
        ({
          namespace: filters.namespace || undefined,
        }) as SysListReq,
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('log.namespace'), render: (row) => row.namespace },
        { title: t('log.logLevel'), render: (row) => row.logLevel },
        {
          title: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
        { title: t('log.content'), render: (row) => JSON.stringify(row.logValue) },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => `[${row.logLevel}] ${row.namespace}` },
        {
          type: 'subtitle',
          label: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
        { type: 'content', label: t('log.content'), render: (row) => JSON.stringify(row.logValue) },
      ],
    },
    form: { fields: () => [] } as any,
  };

  return <SchemaCrudPage config={config} />;
}
