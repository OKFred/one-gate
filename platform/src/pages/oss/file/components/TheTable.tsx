import { Chip } from '@mui/material';
import { GetApp as DownloadIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListFileReq, ListFileRes } from '@/api/oss/type';
import type { FilterState } from './TheFilter';
import * as OSSFileAPI from '@/api/oss/file';

export type FileRes = NonNullable<ListFileRes['list']>[0];

const formatSize = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const tableConfig: SchemaCrudConfig<FileRes, FilterState, ListFileReq>['table'] = {
  columns: (t) => [
    { title: t('oss.file.name'), render: (row) => row.key },
    { title: t('oss.file.size'), render: (row) => formatSize(row.size) },
    {
      title: t('oss.file.contentType'),
      render: (row) =>
        row.contentType ? <Chip label={row.contentType} size="small" variant="outlined" /> : '-',
    },
    {
      title: t('columns.updateTime'),
      render: (row) => dayjs(row.lastModified).format('YYYY-MM-DD HH:mm:ss'),
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.key },
    { type: 'subtitle', label: t('oss.file.size'), render: (row) => formatSize(row.size) },
    {
      type: 'tags',
      render: (row) =>
        row.contentType ? <Chip label={row.contentType} size="small" color="primary" /> : null,
    },
  ],

  actions: () => [
    {
      key: 'download',
      color: 'primary',
      icon: <DownloadIcon />,
      onClick: async (row) => {
        try {
          const res = await OSSFileAPI.getFn({ data: { key: row.key } });
          const downloadUrl = res.data?.data?.downloadUrl;
          if (downloadUrl) {
            window.open(downloadUrl, '_blank');
          }
        } catch (e) {
          console.error(e);
        }
      },
    },
  ],
};
