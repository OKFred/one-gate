import { forwardRef, useImperativeHandle, useState, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import * as OSSConfigAPI from '@/api/oss/config';
import type { Props } from '../index';

export interface TheFormRef {
  open: (id?: number) => void;
}

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const t = useTranslation();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState<number | undefined>();
    const [form, setForm] = useState({
      name: '',
      provider: 'S3' as 'S3' | 'R2',
      endpoint: '',
      region: 'auto',
      accessKey: '',
      secretKey: '',
      bucket: '',
      accountId: '',
      isDefault: false,
      isEnabled: true,
      remark: '',
    });

    useImperativeHandle(ref, () => ({
      open: async (editId?: number) => {
        setId(editId);
        if (editId) {
          try {
            const res = await OSSConfigAPI.getFn({ data: { id: editId } });
            const data = res.data?.data;
            if (data) {
              setForm({
                name: data.name || '',
                provider: data.provider || 'S3',
                endpoint: data.endpoint || '',
                region: data.region || 'auto',
                accessKey: data.accessKey || '',
                secretKey: data.secretKey || '',
                bucket: data.bucket || '',
                accountId: data.accountId || '',
                isDefault: !!data.isDefault,
                isEnabled: !!data.isEnabled,
                remark: data.remark || '',
              });
            }
          } catch (e) {
            console.error(e);
          }
        } else {
          setForm({
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
          });
        }
        setVisible(true);
      },
    }));

    const handleSave = async () => {
      setLoading(true);
      try {
        if (id) {
          await OSSConfigAPI.updateFn({ data: { ...form, id } });
        } else {
          await OSSConfigAPI.addFn({ data: form });
        }
        setVisible(false);
        tableRef.current?.refresh();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={visible} onClose={() => setVisible(false)} fullWidth maxWidth="sm">
        <DialogTitle>{id ? t('dialog.edit') : t('dialog.add')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('oss.config.name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                select
                fullWidth
                label={t('oss.config.provider')}
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value as 'S3' | 'R2' })}
              >
                <MenuItem value="S3">S3 Compatible</MenuItem>
                <MenuItem value="R2">Cloudflare R2</MenuItem>
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label={t('oss.config.bucket')}
                value={form.bucket}
                onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('oss.config.endpoint')}
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="http://localhost:9000"
              />
            </Grid>
            {form.provider === 'R2' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  label={t('oss.config.accountId')}
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                />
              </Grid>
            )}
            <Grid size={6}>
              <TextField
                fullWidth
                label={t('oss.config.region')}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('oss.config.accessKey')}
                value={form.accessKey}
                onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                type="password"
                label={t('oss.config.secretKey')}
                value={form.secretKey}
                onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  />
                }
                label={t('oss.config.isDefault')}
              />
            </Grid>
            <Grid size={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                  />
                }
                label={t('status.enabled')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVisible(false)}>{t('dialog.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" loading={loading}>
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
