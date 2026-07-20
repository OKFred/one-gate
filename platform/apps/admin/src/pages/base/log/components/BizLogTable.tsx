import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as LogAPI from '@/api/admin/base/log';
import type { BizListReq, BizListRes } from '@/api/admin/base/log';
import dayjs from 'dayjs';

type BizRecord = BizListRes['list'][0];

export default function BizLogTable() {
  const config: SchemaCrudConfig<BizRecord, any, BizListReq> = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: LogAPI.bizList,
    },
    filter: {
      defaultFilters: {},
      fields: (t) => [{ name: 'namespace', label: t('log.namespace'), type: 'text' }],
      transformRequest: (filters) =>
        ({
          namespace: filters.namespace || undefined,
        }) as BizListReq,
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('log.namespace'), render: (row) => row.namespace },
        { title: t('columns.status'), render: (row) => row.status },
        { title: t('log.payloadType'), render: (row) => row.payloadType },
        {
          title: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
        { title: t('log.content'), render: (row) => JSON.stringify(row.logValue) },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => `[${row.status}] ${row.namespace}` },
        {
          type: 'subtitle',
          label: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
        { type: 'content', label: t('log.payloadType'), render: (row) => row.payloadType },
        { type: 'content', label: t('log.content'), render: (row) => JSON.stringify(row.logValue) },
      ],
    },
    form: { fields: () => [] } as any,
  };

  return <SchemaCrudPage config={config} />;
}
