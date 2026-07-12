import { useState } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import * as BrowserConfigAPI from '@/api/infra/rpa/browser/config';
import type { ListBrowserConfigReq, BrowserConfigObj } from '@/api/infra/rpa/browser/type';
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

const DEFAULT_FORM: Partial<BrowserConfigObj> = {
  name: '',
  cdpUrl: '',
  isDefault: false,
  isEnabled: true,
  remark: '',
};

export default function BrowserConfigManagement() {
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const t = useTranslation();

  // 连通性测试
  const handleVerify = async (id: number) => {
    try {
      setVerifyingId(id);
      const res = await BrowserConfigAPI.verifyFn({ data: { id } });
      if (res.data.data) {
        showSnackbar({
          message: t('infra.rpa.browser.verifySuccess'),
          type: 'success',
        });
      } else {
        showSnackbar({
          message: t('infra.rpa.browser.verifyFailed'),
          type: 'error',
        });
      }
    } catch {
      showSnackbar({ message: t('infra.rpa.browser.verifyError'), type: 'error' });
    } finally {
      setVerifyingId(null);
    }
  };

  const extraContext: TableExtraContext = {
    verifyingId,
    handleVerify,
  };

  const config: SchemaCrudConfig<
    BrowserConfigObj,
    FilterState,
    ListBrowserConfigReq,
    TableExtraContext
  > = {
    apiKeyName: 'id',
    permissions: {
      add: [THIS_PERMISSION.add],
      edit: [THIS_PERMISSION.edit],
      delete: [THIS_PERMISSION.delete],
    },
    api: {
      list: BrowserConfigAPI.listFn,
      add: BrowserConfigAPI.addFn,
      update: BrowserConfigAPI.updateFn,
      delete: BrowserConfigAPI.deleteFn,
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
        }) as ListBrowserConfigReq,
    },
    table: {
      columns: (t) => [
        { title: 'ID', render: (row) => row.id },
        { title: t('infra.rpa.browser.name'), render: (row) => row.name },
        { title: t('infra.rpa.browser.cdpUrlLabel'), render: (row) => row.cdpUrl },
        {
          title: t('infra.rpa.browser.defaultEnv'),
          render: (row) => (
            <Chip
              label={row.isDefault ? t('infra.rpa.browser.yes') : t('infra.rpa.browser.no')}
              color={row.isDefault ? 'success' : 'default'}
              size="small"
            />
          ),
        },
        {
          title: t('infra.rpa.browser.status'),
          render: (row) => (
            <Chip
              label={
                row.isEnabled ? t('infra.rpa.browser.enabled') : t('infra.rpa.browser.disabled')
              }
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
          label: t('infra.rpa.browser.cdpUrlCardLabel'),
          render: (row) => row.cdpUrl,
        },
        {
          type: 'tags',
          render: (row) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label={
                  row.isEnabled ? t('infra.rpa.browser.enabled') : t('infra.rpa.browser.disabled')
                }
                color={row.isEnabled ? 'success' : 'error'}
                size="small"
              />
              {row.isDefault && (
                <Chip label={t('infra.rpa.browser.default')} color="success" size="small" />
              )}
            </Box>
          ),
        },
      ],
      actions: (t, extraContext) => [
        {
          key: 'verify',
          label: t('infra.rpa.browser.testConnection'),
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
            label={t('infra.rpa.browser.name')}
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label={t('infra.rpa.browser.cdpUrlFormLabel')}
            value={form.cdpUrl || ''}
            onChange={(e) => setForm({ ...form, cdpUrl: e.target.value })}
            fullWidth
            required
            helperText={t('infra.rpa.browser.cdpUrlHelper')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
            }
            label={t('infra.rpa.browser.setDefaultEnv')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isEnabled !== false}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              />
            }
            label={t('infra.rpa.browser.enableEnv')}
          />
          <TextField
            label={t('infra.rpa.browser.remark')}
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
