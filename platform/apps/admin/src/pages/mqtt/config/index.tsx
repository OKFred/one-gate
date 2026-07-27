import React, { useState } from 'react';
import { SchemaCrudPage, type SchemaCrudConfig } from '@/components/Crud';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';
import { Add as AddIcon, Edit as EditIcon, Sensors as SensorsIcon } from '@mui/icons-material';
import { Chip, Switch, Box, Typography, CircularProgress } from '@mui/material';

import dayjs from 'dayjs';
import * as BaseSysConfigAPI from '@/api/admin/base/sys_config';
import * as MqttAPI from '@/api/admin/mqtt';
import type { ConfigRes, ListConfigReq } from '@/api/admin/base/type';
import { BaseSysConfigFormDialog } from '../../base/sys_config/components/BaseSysConfigFormDialog';

interface ExtraContext {
  handleEdit: (row: ConfigRes) => void;
  handleTestConnection: (row: ConfigRes) => void;
  refreshList: () => void;
  testingId: number | null;
}

export default function MqttConfigPage() {
  const t = useTranslation();

  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<ConfigRes | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  const handleTestConnection = async (row: ConfigRes) => {
    setTestingId(row.id);
    try {
      const res = await MqttAPI.testConnectionFn({
        data: { id: row.id },
      });

      showSnackbar({
        message: res.data.message || t('admin.mqtt.config.testSuccess'),
        type: 'success',
      });
    } catch {
    } finally {
      setTestingId(null);
    }
  };

  const extraContext: ExtraContext = {
    handleEdit: (row) => {
      setEditRow(row);
      setFormOpen(true);
    },
    handleTestConnection,
    refreshList: () => {},
    testingId,
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
            namespace: 'mqtt',
          },
        }),
      delete: BaseSysConfigAPI.deleteFn,
    },
    filter: {
      defaultFilters: {
        namespace: 'mqtt',
      },
      fields: () => [],
      transformRequest: (req: any) => ({
        pageNo: 1,
        pageSize: 20,
        ...req,
        namespace: 'mqtt',
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
          title: t('admin.mqtt.config.provider'),
          width: 130,
          render: (row: ConfigRes) => {
            const val = (row.configValue || {}) as Record<string, unknown>;
            const isAliyun = val.provider === 'Aliyun';
            return (
              <Chip
                label={
                  isAliyun
                    ? t('admin.mqtt.config.providerAliyun')
                    : t('admin.mqtt.config.providerEmqx')
                }
                size="small"
                color={isAliyun ? 'warning' : 'info'}
                variant="outlined"
              />
            );
          },
        },
        {
          title: t('admin.mqtt.config.hostPort'),
          width: 220,
          render: (row: ConfigRes) => {
            const val = (row.configValue || {}) as Record<string, unknown>;
            const host = String(val.host || '127.0.0.1');
            const port = String(val.port || 1883);
            const proto = String(val.protocol || 'mqtt');
            return (
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ color: 'primary.main', fontWeight: 'medium' }}
                >
                  {proto}://
                </Typography>
                {host}:{port}
              </Box>
            );
          },
        },
        {
          title: t('admin.mqtt.config.clientId'),
          width: 180,
          render: (row: ConfigRes) => {
            const val = (row.configValue || {}) as Record<string, unknown>;
            return (
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {String(val.clientId || '-')}
              </Typography>
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
              <Chip label={t('admin.mqtt.config.primary')} size="small" color="primary" />
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
          key: 'test',
          icon: (row: ConfigRes) =>
            ctx?.testingId === row.id ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SensorsIcon />
            ),
          label: ctx?.testingId
            ? t('admin.mqtt.config.testing')
            : t('admin.mqtt.config.testConnection'),
          disabled: (row: ConfigRes) => ctx?.testingId === row.id,
          onClick: (row) => ctx?.handleTestConnection(row),
        },
        {
          key: 'edit',
          icon: <EditIcon />,
          label: t('admin.mqtt.config.edit'),
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
      {t('admin.mqtt.config.create')}
    </ResponsiveButton>
  );

  return (
    <React.Fragment>
      <SchemaCrudPage config={config} extraContext={extraContext} customActions={customActions} />

      {formOpen && (
        <BaseSysConfigFormDialog
          open={formOpen}
          editRow={editRow}
          onClose={() => setFormOpen(false)}
          onSuccess={() => {
            setFormOpen(false);
            extraContext.refreshList();
          }}
        />
      )}
    </React.Fragment>
  );
}
