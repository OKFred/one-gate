import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import * as RpaConfigAPI from '@/api/admin/rpa/config/config';
import type { ListRpaConfigReq, RpaConfigObj } from '@/api/admin/rpa/config/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import { THIS_PERMISSION, FULL_PREFIX } from './constant';
import { Chip, Box, CircularProgress, TextField, FormControlLabel, Switch } from '@mui/material';

import { PlayArrow as VerifyIcon } from '@mui/icons-material';

interface FilterState {
  keyword: string;
}

interface TableExtraContext {
  verifyingId: number | null;
  handleVerify: (id: number) => Promise<void>;
}

const DEFAULT_FORM: Partial<RpaConfigObj> = {
  name: '',
  cdpUrl: '',
  authToken: '',
  isDefault: false,
  isEnabled: true,
  remark: '',
};

export default function RpaConfigManagement() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 连通性测试
  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      const res = await RpaConfigAPI.verifyFn({ data: { id } });
      if (res.data.data) {
        showSnackbar({
          message: t('admin.rpa.config.verifySuccess'),
          type: 'success',
        });
      } else {
        showSnackbar({
          message: t('admin.rpa.config.verifyFailed'),
          type: 'error',
        });
      }
    } catch {
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<RpaConfigObj, FilterState, ListRpaConfigReq, TableExtraContext> = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: RpaConfigAPI.listFn,
      add: RpaConfigAPI.addFn,
      update: RpaConfigAPI.updateFn,
      delete: RpaConfigAPI.deleteFn,
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
        }) as ListRpaConfigReq,
    },
    table: {
      columns: (t) => [
        { title: 'ID', render: (row) => row.id },
        { title: t('admin.rpa.config.name'), render: (row) => row.name },
        { title: t('admin.rpa.config.cdpUrlLabel'), render: (row) => row.cdpUrl },
        {
          title: t('admin.rpa.config.defaultEnv'),
          render: (row) => (
            <Chip
              label={row.isDefault ? t('admin.rpa.config.yes') : t('admin.rpa.config.no')}
              color={row.isDefault ? 'success' : 'default'}
              size="small"
            />
          ),
        },
        {
          title: t('admin.rpa.config.status'),
          render: (row) => (
            <Chip
              label={row.isEnabled ? t('admin.rpa.config.enabled') : t('admin.rpa.config.disabled')}
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
          label: t('admin.rpa.config.cdpUrlCardLabel'),
          render: (row) => row.cdpUrl,
        },
        {
          type: 'tags',
          render: (row) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label={
                  row.isEnabled ? t('admin.rpa.config.enabled') : t('admin.rpa.config.disabled')
                }
                color={row.isEnabled ? 'success' : 'error'}
                size="small"
              />
              {row.isDefault && (
                <Chip label={t('admin.rpa.config.default')} color="success" size="small" />
              )}
            </Box>
          ),
        },
      ],
      actions: (t, extraContext) => [
        {
          key: 'verify',
          label: t('admin.rpa.config.testConnection'),
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
      schema: `${FULL_PREFIX}.add.req`,
      defaultForm: DEFAULT_FORM,
      renderForm: (form, setForm, _isMobile, t) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('admin.rpa.config.name')}
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label={t('admin.rpa.config.cdpUrlFormLabel')}
            value={form.cdpUrl || ''}
            onChange={(e) => setForm({ ...form, cdpUrl: e.target.value })}
            fullWidth
            required
            helperText={t('admin.rpa.config.cdpUrlHelper')}
          />
          <TextField
            label={t('admin.rpa.config.authToken')}
            value={form.authToken || ''}
            onChange={(e) => setForm({ ...form, authToken: e.target.value })}
            fullWidth
            helperText={t('admin.rpa.config.authTokenHelper')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
            }
            label={t('admin.rpa.config.setDefaultEnv')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isEnabled !== false}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              />
            }
            label={t('admin.rpa.config.enableEnv')}
          />
          <TextField
            label={t('admin.rpa.config.remark')}
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
