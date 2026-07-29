import React, { useState } from 'react';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { Chip, Switch, Box, Typography } from '@mui/material';

import dayjs from 'dayjs';
import * as BaseSysConfigAPI from '@/api/admin/base/sys_config';
import type { ConfigRes, ListConfigReq } from '@/api/admin/base/type';
import { BaseSysConfigFormDialog } from '../../base/sys_config/components/BaseSysConfigFormDialog';

interface ExtraContext {
  handleEdit: (row: ConfigRes) => void;
  refreshList: () => void;
}

export default function VoiceConfigPage() {
  const t = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<ConfigRes | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const extraContext: ExtraContext = {
    handleEdit: (row) => {
      setEditRow(row);
      setFormOpen(true);
    },
    refreshList: () => {},
  };

  const config: SchemaCrudConfig<
    ConfigRes,
    Record<string, unknown>,
    ListConfigReq,
    ExtraContext
  > = {
    apiKeyName: 'id',
    permissions: {
      delete: [],
    },
    api: {
      list: (req) =>
        BaseSysConfigAPI.listFn({
          ...req,
          data: {
            ...req?.data,
            namespace: 'voice',
          },
        }),
      delete: BaseSysConfigAPI.deleteFn,
    },
    filter: {
      defaultFilters: {
        namespace: 'voice',
      },
      fields: () => [],
      transformRequest: (req: Record<string, unknown>) => ({
        pageNo: 1,
        pageSize: 20,
        ...req,
        namespace: 'voice',
      }),
    },
    table: {
      columns: () => [
        { title: 'ID', width: 70, render: (row: ConfigRes) => row.id },
        {
          title: t('admin.base.configKey'),
          width: 180,
          render: (row: ConfigRes) => (
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {row.configKey}
            </Typography>
          ),
        },
        {
          title: t('voice.config.cfAccountId'),
          width: 250,
          render: (row: ConfigRes) => {
            const val = (row.configValue || {}) as Record<string, unknown>;
            return (
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {String(val.cfAccountId || '-')}
              </Box>
            );
          },
        },
        {
          title: t('voice.config.rtkAppId'),
          width: 250,
          render: (row: ConfigRes) => {
            const val = (row.configValue || {}) as Record<string, unknown>;
            return (
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {String(val.rtkAppId || '-')}
              </Box>
            );
          },
        },
        {
          title: t('common.isEnabled'),
          width: 90,
          render: (row: ConfigRes) => <Switch size="small" checked={!!row.isEnabled} readOnly />,
        },
        {
          title: t('admin.base.isPrimary'),
          width: 100,
          render: (row: ConfigRes) =>
            row.isPrimary ? (
              <Chip label={t('voice.config.primary')} size="small" color="primary" />
            ) : null,
        },
        {
          title: t('columns.createTime'),
          width: 170,
          render: (row: ConfigRes) =>
            row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
        },
      ],
      cardFields: () => [],
      actions: (_t, ctx) => [
        {
          key: 'edit',
          icon: <EditIcon />,
          label: t('voice.config.edit'),
          onClick: (row) => ctx?.handleEdit(row),
        },
      ],
    },
    form: {
      schema: {},
      defaultForm: {},
    },
  };

  const customActions = (
    <ResponsiveButton
      startIcon={<AddIcon />}
      variant="contained"
      color="primary"
      onClick={() => {
        setEditRow(null);
        setFormOpen(true);
      }}
    >
      {t('voice.config.create')}
    </ResponsiveButton>
  );

  return (
    <React.Fragment>
      <SchemaCrudPage
        key={refreshKey}
        config={config}
        extraContext={extraContext}
        customActions={customActions}
      />

      {formOpen && (
        <BaseSysConfigFormDialog
          open={formOpen}
          editRow={editRow}
          defaultNamespace="voice"
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}
    </React.Fragment>
  );
}
