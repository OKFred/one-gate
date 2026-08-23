import { useState } from 'react';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { Chip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { ResponsiveButton } from '@/components/Responsive';
import { useTranslation } from '@/hooks/useTranslation';
import * as WebhookConfigAPI from '@/api/admin/base/webhook_config';
import type { ListWebhookConfigReq, WebhookConfigRow } from '@/api/admin/base/webhook_config.type';
import { THIS_PERMISSION } from './constant';
import { WebhookConfigFormDialog } from './components/WebhookConfigFormDialog';

interface Filters {
  keyword: string;
  source: string;
  isEnabled: boolean | undefined;
}

interface ExtraContext {
  edit: (row: WebhookConfigRow) => void;
}

const defaultFilters: Filters = { keyword: '', source: '', isEnabled: undefined };

export default function WebhookConfigPage() {
  const t = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const extraContext: ExtraContext = {
    edit: (row) => {
      setEditId(row.id);
      setDialogOpen(true);
    },
  };

  const config: SchemaCrudConfig<WebhookConfigRow, Filters, ListWebhookConfigReq, ExtraContext> = {
    apiKeyName: 'id',
    permissions: { delete: [THIS_PERMISSION.delete] },
    api: {
      list: WebhookConfigAPI.listFn,
      delete: WebhookConfigAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: (translate) => [
        {
          name: 'keyword',
          type: 'text',
          label: translate('filter.keyword'),
          placeholder: translate('admin.base.webhookConfig.keywordPlaceholder'),
        },
        {
          name: 'source',
          type: 'text',
          label: translate('admin.base.webhookConfig.source'),
        },
        {
          name: 'isEnabled',
          type: 'select',
          label: translate('filter.enabledStatus'),
          options: [
            { label: translate('filter.all'), value: undefined },
            { label: translate('status.enabled'), value: true },
            { label: translate('status.disabled'), value: false },
          ],
        },
      ],
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
          source: filters.source || undefined,
          isEnabled: filters.isEnabled,
        }) as ListWebhookConfigReq,
    },
    table: {
      columns: (translate) => [
        { title: translate('columns.id'), width: 80, render: (row) => row.id },
        {
          title: translate('admin.base.webhookConfig.source'),
          render: (row) => <Chip label={row.source} size="small" color="info" variant="outlined" />,
        },
        {
          title: translate('admin.base.webhookConfig.url'),
          render: (row) => (
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {row.url}
            </Typography>
          ),
        },
        {
          title: translate('common.isEnabled'),
          render: (row) => (
            <Chip
              label={row.isEnabled ? translate('status.enabled') : translate('status.disabled')}
              color={row.isEnabled ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          title: translate('admin.base.isPrimary'),
          render: (row) =>
            row.isPrimary ? <Chip label="Yes" size="small" color="success" /> : null,
        },
        {
          title: translate('columns.createTime'),
          render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
        },
      ],
      cardFields: (translate) => [
        { type: 'title', render: (row) => row.source },
        { type: 'content', label: 'URL', render: (row) => row.url },
        {
          type: 'tags',
          render: (row) => (
            <Chip
              label={row.isEnabled ? translate('status.enabled') : translate('status.disabled')}
              color={row.isEnabled ? 'success' : 'default'}
              size="small"
            />
          ),
        },
      ],
      actions: (_translate, context) => [
        {
          key: 'edit',
          icon: <EditIcon />,
          permissionCodes: [THIS_PERMISSION.edit],
          onClick: (row) => context?.edit(row),
        },
      ],
    },
    form: { schema: {}, defaultForm: {} },
  };

  return (
    <>
      <SchemaCrudPage
        key={refreshKey}
        config={config}
        extraContext={extraContext}
        customActions={
          <ResponsiveButton
            startIcon={<AddIcon />}
            variant="contained"
            permissionCodes={[THIS_PERMISSION.add]}
            onClick={() => {
              setEditId(null);
              setDialogOpen(true);
            }}
          >
            {t('dialog.add')}
          </ResponsiveButton>
        }
      />
      <WebhookConfigFormDialog
        open={dialogOpen}
        editId={editId}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          setRefreshKey((value) => value + 1);
        }}
      />
    </>
  );
}
