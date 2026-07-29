import { Chip, Tooltip } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListMailTemplateReq, ListMailTemplateRes } from '@/api/admin/mail/type';
import type { FilterState } from './TheFilter';

export type TemplateRes = NonNullable<ListMailTemplateRes['list']>[0];

export interface TableExtraContext {
  openPreview: (row: TemplateRes) => void;
}

const truncateText = (text?: string, maxLength = 50) => {
  if (!text) return '-';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

const stripHtml = (html?: string) => {
  if (!html) return '-';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return html;
  }
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '-';
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

export const tableConfig: SchemaCrudConfig<
  TemplateRes,
  FilterState,
  ListMailTemplateReq,
  TableExtraContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    {
      title: t('template.table.title'),
      render: (row) => (
        <Tooltip title={row.title || ''}>
          <span>{truncateText(row.title, 30)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('template.table.name'),
      render: (row) => (
        <Tooltip title={row.name || ''}>
          <span>{truncateText(row.name, 20)}</span>
        </Tooltip>
      ),
    },
    {
      title: t('dialog.title.preview'),
      render: (row) => truncateText(stripHtml(row.content), 40),
    },
    {
      title: t('mail.scope'),
      render: (row) => {
        const scope = row.scope || 'sys';
        const colorMap = { sys: 'primary', biz: 'secondary', user: 'info' } as const;
        const labelMap: Record<string, string> = {
          sys: t('mail.scope.sys'),
          biz: t('mail.scope.biz'),
          user: t('mail.scope.user'),
        };
        return (
          <Chip
            label={labelMap[scope] || scope}
            color={colorMap[scope as keyof typeof colorMap] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      title: t('columns.createTime'),
      render: (row) => formatDate(row.createTimeUtc),
    },
    {
      title: t('column.remark'),
      render: (row) => row.remark || '-',
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.title },
    {
      type: 'subtitle',
      label: `ID: ${t('template.table.name')}`,
      render: (row) => `${row.id} | ${row.name}`,
    },
    {
      type: 'content',
      label: t('dialog.title.preview'),
      render: (row) => truncateText(stripHtml(row.content), 100),
    },
    {
      type: 'content',
      label: t('columns.createTime'),
      render: (row) => formatDate(row.createTimeUtc),
    },
    {
      type: 'content',
      label: t('column.remark'),
      render: (row) => row.remark || '-',
    },
    {
      type: 'tags',
      render: (row) => (
        <>
          {row.langCode && <Chip label={row.langCode} color="info" size="small" />}
          {row.category && <Chip label={row.category} color="secondary" size="small" />}
        </>
      ),
    },
  ],

  actions: (_t, extraContext) => [
    {
      key: 'preview',
      color: 'info',
      icon: <VisibilityIcon />,
      onClick: (row) => {
        if (extraContext?.openPreview) {
          extraContext.openPreview(row);
        }
      },
    },
  ],
};
