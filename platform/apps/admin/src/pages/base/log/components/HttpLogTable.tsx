import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import * as LogAPI from '@/api/admin/base/log';
import type { HttpListReq, HttpListRes } from '@/api/admin/base/log';
import dayjs from 'dayjs';
import { Chip } from '@mui/material';

type HttpRecord = HttpListRes['list'][0];

interface HttpFilterState {
  keyword: string;
  method: string;
  protocol: string;
}

export default function HttpLogTable() {
  const config: SchemaCrudConfig<HttpRecord, HttpFilterState, HttpListReq> = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: LogAPI.httpList,
    },
    filter: {
      defaultFilters: {
        keyword: '',
        method: '',
        protocol: '',
      },
      fields: (t) => [
        {
          name: 'keyword',
          label: t('log.url'),
          type: 'text',
          placeholder: '搜索 URL 关键词...',
        },
        {
          name: 'method',
          label: t('log.method'),
          type: 'select',
          options: [
            { label: t('log.allMethod'), value: '' },
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'HEAD', value: 'HEAD' },
            { label: 'OPTIONS', value: 'OPTIONS' },
          ],
        },
        {
          name: 'protocol',
          label: t('log.protocol'),
          type: 'select',
          options: [
            { label: t('log.allProtocol'), value: '' },
            { label: 'https', value: 'https' },
            { label: 'http', value: 'http' },
          ],
        },
      ],
      transformRequest: (filters: HttpFilterState): HttpListReq => ({
        keyword: filters.keyword ? filters.keyword.trim() : undefined,
        method: filters.method || undefined,
        protocol: filters.protocol || undefined,
        pageNo: 1,
        pageSize: 10,
      }),
    },
    table: {
      columns: (t) => [
        { title: t('columns.id'), render: (row) => row.id },
        { title: t('log.namespace'), render: (row) => row.namespace },
        {
          title: t('log.method'),
          render: (row) => (
            <Chip
              label={row.method}
              size="small"
              color={row.method === 'POST' ? 'primary' : row.method === 'GET' ? 'info' : 'default'}
            />
          ),
        },
        {
          title: t('log.url'),
          render: (row) => row.url,
        },
        {
          title: t('log.status'),
          render: (row) => (
            <Chip
              label={row.responseStatus || 'N/A'}
              size="small"
              color={
                row.responseStatus && row.responseStatus >= 200 && row.responseStatus < 300
                  ? 'success'
                  : 'error'
              }
            />
          ),
        },
        {
          title: t('log.duration'),
          render: (row) => (row.durationMs !== undefined && row.durationMs !== null ? `${row.durationMs}ms` : '--'),
        },
        {
          title: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => `[${row.method}] ${row.url}` },
        {
          type: 'subtitle',
          label: t('columns.createTime'),
          render: (row) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
        { type: 'content', label: t('log.status'), render: (row) => String(row.responseStatus || 'N/A') },
      ],
    },
    form: { schema: {}, defaultForm: {} },
  };

  return <SchemaCrudPage config={config} />;
}
