import { TextField, MenuItem, FormControlLabel, Switch, Grid } from '@mui/material';
import type { Dispatch, SetStateAction } from 'react';
import type { AddConfigReq } from '@/api/oss/type';

export interface ConfigFormFieldsProps {
  form: Partial<AddConfigReq>;
  setForm: Dispatch<SetStateAction<Partial<AddConfigReq>>>;
  isMobile: boolean;
  t: (key: string) => string;
}

/**
 * OSS 存储配置受控表单字段组件
 */
export default function ConfigFormFields({ form, setForm, t }: ConfigFormFieldsProps) {
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
          fullWidth
          label={t('oss.config.name')}
          value={form.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          required
        />
      </Grid>
      <Grid size={6}>
        <TextField
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
          fullWidth
          label={t('oss.config.bucket')}
          value={form.bucket || ''}
          onChange={(e) => handleFieldChange('bucket', e.target.value)}
          required
        />
      </Grid>
      <Grid size={12}>
        <TextField
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
            fullWidth
            label={t('oss.config.accountId')}
            value={form.accountId || ''}
            onChange={(e) => handleFieldChange('accountId', e.target.value)}
          />
        </Grid>
      )}
      <Grid size={6}>
        <TextField
          fullWidth
          label={t('oss.config.region')}
          value={form.region || ''}
          onChange={(e) => handleFieldChange('region', e.target.value)}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          fullWidth
          label={t('oss.config.accessKey')}
          value={form.accessKey || ''}
          onChange={(e) => handleFieldChange('accessKey', e.target.value)}
          required
        />
      </Grid>
      <Grid size={12}>
        <TextField
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
