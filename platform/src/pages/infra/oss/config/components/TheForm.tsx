import React from 'react';
import { MenuItem, FormControlLabel, Switch, Grid } from '@mui/material';
import { TextField } from '@/components/Form';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { ConfigRes } from './TheTable';
import type { AddConfigReq, ListConfigReq } from '@/api/infra/oss/type';
import schema from '@/assets/schemas/oss.configAddReq.json';
import updateSchema from '@/assets/schemas/oss.configUpdateReq.json';

export const formConfig: SchemaCrudConfig<ConfigRes, FilterState, ListConfigReq>['form'] = {
  schema,
  updateSchema,
  defaultForm: {
    name: '',
    provider: 'S3',
    endpoint: '',
    region: 'auto',
    accessKey: '',
    secretKey: '',
    bucket: '',
    accountId: '',
    isDefault: false,
    isEnabled: true,
    remark: '',
  },
  renderForm: (form, setForm, _isMobile, t) =>
    renderConfigForm(
      form as Partial<AddConfigReq>,
      setForm as React.Dispatch<React.SetStateAction<Partial<AddConfigReq>>>,
      t,
    ),
};

function renderConfigForm(
  form: Partial<AddConfigReq>,
  setForm: React.Dispatch<React.SetStateAction<Partial<AddConfigReq>>>,
  t: (key: string) => string,
) {
  const handleFieldChange = (key: keyof AddConfigReq, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Grid container spacing={2} sx={{ pt: 1 }}>
      <Grid size={12}>
        <TextField
          name="name"
          fullWidth
          label={t('oss.config.name')}
          value={form.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          required
        />
      </Grid>
      <Grid size={6}>
        <TextField
          name="provider"
          select
          fullWidth
          label={t('oss.config.provider')}
          value={form.provider || 'S3'}
          onChange={(e) => handleFieldChange('provider', e.target.value as 'S3' | 'R2')}
        >
          <MenuItem value="S3">S3 Compatible</MenuItem>
          <MenuItem value="R2">Cloudflare R2</MenuItem>
        </TextField>
      </Grid>
      <Grid size={6}>
        <TextField
          name="bucket"
          fullWidth
          label={t('oss.config.bucket')}
          value={form.bucket || ''}
          onChange={(e) => handleFieldChange('bucket', e.target.value)}
          required
        />
      </Grid>
      <Grid size={12}>
        <TextField
          name="endpoint"
          fullWidth
          label={t('oss.config.endpoint')}
          value={form.endpoint || ''}
          onChange={(e) => handleFieldChange('endpoint', e.target.value)}
          placeholder="http://localhost:9000"
        />
      </Grid>
      {form.provider === 'R2' && (
        <Grid size={12}>
          <TextField
            name="accountId"
            fullWidth
            label={t('oss.config.accountId')}
            value={form.accountId || ''}
            onChange={(e) => handleFieldChange('accountId', e.target.value)}
          />
        </Grid>
      )}
      <Grid size={6}>
        <TextField
          name="region"
          fullWidth
          label={t('oss.config.region')}
          value={form.region || ''}
          onChange={(e) => handleFieldChange('region', e.target.value)}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          name="accessKey"
          fullWidth
          label={t('oss.config.accessKey')}
          value={form.accessKey || ''}
          onChange={(e) => handleFieldChange('accessKey', e.target.value)}
          required
        />
      </Grid>
      <Grid size={12}>
        <TextField
          name="secretKey"
          fullWidth
          type="password"
          label={t('oss.config.secretKey')}
          value={form.secretKey || ''}
          onChange={(e) => handleFieldChange('secretKey', e.target.value)}
          required
        />
      </Grid>
      <Grid size={6}>
        <FormControlLabel
          control={
            <Switch
              checked={!!form.isDefault}
              onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
            />
          }
          label={t('oss.config.isDefault')}
        />
      </Grid>
      <Grid size={6}>
        <FormControlLabel
          control={
            <Switch
              checked={form.isEnabled !== false}
              onChange={(e) => handleFieldChange('isEnabled', e.target.checked)}
            />
          }
          label={t('status.enabled')}
        />
      </Grid>
    </Grid>
  );
}
