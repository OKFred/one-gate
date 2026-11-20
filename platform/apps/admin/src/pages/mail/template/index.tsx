import { Suspense, lazy, useState } from 'react';
import { Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { adminMailTemplateContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import type { ListMailTemplateRes } from '@/api/admin/mail/type';
import ThePreview from './components/ThePreview';

const JoditEditor = lazy(() => import('@/components/JoditEditor/index'));

type TemplateRecord = NonNullable<ListMailTemplateRes['list']>[number] & Record<string, unknown>;

function truncateText(text?: string | null, maxLength = 50): string {
  if (!text) return '-';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

function stripHtml(html?: string | null): string {
  if (!html) return '-';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  } catch {
    return html;
  }
}

export default function MailTemplatePage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<TemplateRecord | null>(null);

  const extensions: CrudExtensions<TemplateRecord> = {
    customCells: {
      title: (row) => (
        <Tooltip title={row.title || ''}>
          <span>{truncateText(row.title, 30)}</span>
        </Tooltip>
      ),
      name: (row) => (
        <Tooltip title={row.name || ''}>
          <span>{truncateText(row.name, 20)}</span>
        </Tooltip>
      ),
      content: (row) => truncateText(stripHtml(row.content), 40),
    },
    customCardFields: (translate) => [
      { type: 'title', render: (row) => row.title },
      {
        type: 'subtitle',
        label: `ID: ${translate('template.table.name')}`,
        render: (row) => `${row.id} | ${row.name}`,
      },
      {
        type: 'content',
        label: translate('dialog.title.preview'),
        render: (row) => truncateText(stripHtml(row.content), 100),
      },
      {
        type: 'content',
        label: translate('columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '-',
      },
      {
        type: 'content',
        label: translate('column.remark'),
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
    rowActions: () => [
      {
        key: 'preview',
        color: 'info',
        icon: <VisibilityIcon />,
        onClick: (row) => {
          setPreviewData(row);
          setPreviewOpen(true);
        },
      },
    ],
    customFormFields: {
      content: (ctx) => (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
            {ctx.t('template.table.contentLabel')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {ctx.t('template.table.contentHelp')}
          </Typography>
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            }
          >
            <JoditEditor
              value={typeof ctx.form.content === 'string' ? ctx.form.content : ''}
              onChange={(html) => ctx.setForm((prev) => ({ ...prev, content: html }))}
              placeholder={ctx.t('form.pleaseEnter')}
              height={ctx.isMobile ? 300 : 450}
            />
          </Suspense>
        </Box>
      ),
    },
    beforeSubmitAsync: (form, isEdit) => ({
      ...form,
      langCode: form.langCode || (isEdit ? undefined : ''),
      category: form.category || '',
      remark: form.remark ?? null,
    }),
    dialogs: () => (
      <ThePreview open={previewOpen} onClose={() => setPreviewOpen(false)} template={previewData} />
    ),
  };

  return <ContractCrudPage contract={adminMailTemplateContract} extensions={extensions} />;
}
