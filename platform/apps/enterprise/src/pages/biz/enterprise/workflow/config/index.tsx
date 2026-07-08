import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import * as WorkflowAPI from '@/api/biz/enterprise/workflow';
import type { ListConfigReq, ConfigObj } from '@/api/biz/enterprise/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import { THIS_PERMISSION, FULL_PREFIX } from '../constant';
import { Chip, Box, CircularProgress, TextField, FormControlLabel, Switch } from '@mui/material';

import { PlayArrow as VerifyIcon } from '@mui/icons-material';

interface FilterState {
  keyword: string;
}

interface TableExtraContext {
  verifyingId: number | null;
  handleVerify: (id: number) => Promise<void>;
}

const DEFAULT_FORM: Partial<ConfigObj> = {
  name: '',
  cdpUrl: '',
  isDefault: false,
  isEnabled: true,
  remark: '',
};

export default function WorkflowConfigManagement() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 连通性测试
  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      const res = await WorkflowAPI.verifyConfigFn({ data: { id } });
      if (res.data.data) {
        showSnackbar({
          message: t('workflow.config.verifySuccess'),
          type: 'success',
        });
      } else {
        showSnackbar({
          message: t('workflow.config.verifyFailed'),
          type: 'error',
        });
      }
    } catch {
      showSnackbar({ message: t('workflow.config.verifyError'), type: 'error' });
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<ConfigObj, FilterState, ListConfigReq, TableExtraContext> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: WorkflowAPI.listConfigFn,
      add: WorkflowAPI.addConfigFn,
      update: WorkflowAPI.updateConfigFn,
      delete: WorkflowAPI.deleteConfigFn,
    },
    filter: {
      defaultFilters: { keyword: '' },
      fields: (t) => [
        {
          name: 'keyword',
          label: t('search.keyword'),
          type: 'text',
        },
      ],
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as ListConfigReq,
    },
    table: {
      columns: (t) => [
        { title: 'ID', render: (row) => row.id },
        { title: t('workflow.config.name'), render: (row) => row.name },
        { title: t('workflow.config.cdpUrlLabel'), render: (row) => row.cdpUrl },
        {
          title: t('workflow.config.defaultEnv'),
          render: (row) => (
            <Chip
              label={row.isDefault ? t('workflow.config.yes') : t('workflow.config.no')}
              color={row.isDefault ? 'success' : 'default'}
              size="small"
            />
          ),
        },
        {
          title: t('workflow.config.status'),
          render: (row) => (
            <Chip
              label={row.isEnabled ? t('workflow.config.enabled') : t('workflow.config.disabled')}
              color={row.isEnabled ? 'success' : 'error'}
              size="small"
              variant="outlined"
            />
          ),
        },
      ],
      cardFields: (t) => [
        { type: 'title', render: (row) => row.name },
        {
          type: 'subtitle',
          label: t('workflow.config.cdpUrlCardLabel'),
          render: (row) => row.cdpUrl,
        },
        {
          type: 'tags',
          render: (row) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label={row.isEnabled ? t('workflow.config.enabled') : t('workflow.config.disabled')}
                color={row.isEnabled ? 'success' : 'error'}
                size="small"
              />
              {row.isDefault && (
                <Chip label={t('workflow.config.default')} color="success" size="small" />
              )}
            </Box>
          ),
        },
      ],
      actions: (t, extraContext) => [
        {
          key: 'verify',
          label: t('workflow.config.testConnection'),
          color: 'success',
          permissionCodes: [THIS_PERMISSION.read],
          icon: (row) => {
            const isVerifying = extraContext?.verifyingId === row.id;
            return isVerifying ? <CircularProgress size={20} color="inherit" /> : <VerifyIcon />;
          },
          disabled: (row) => {
            return extraContext?.verifyingId === row.id;
          },
          onClick: async (row) => {
            if (row.id && extraContext?.handleVerify) {
              await extraContext.handleVerify(row.id);
            }
          },
        },
      ],
    },
    form: {
      schema: `${FULL_PREFIX}.workflowConfig_addReq`,
      defaultForm: DEFAULT_FORM,
      renderForm: (form, setForm, _isMobile, t) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('workflow.config.name')}
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label={t('workflow.config.cdpUrlFormLabel')}
            value={form.cdpUrl || ''}
            onChange={(e) => setForm({ ...form, cdpUrl: e.target.value })}
            fullWidth
            required
            helperText={t('workflow.config.cdpUrlHelper')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
            }
            label={t('workflow.config.setDefaultEnv')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isEnabled !== false}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              />
            }
            label={t('workflow.config.enableEnv')}
          />
          <TextField
            label={t('workflow.config.remark')}
            value={form.remark || ''}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      ),
    },
  };

  return <SchemaCrudPage config={config} extraContext={extraContext} />;
}
