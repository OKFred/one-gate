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
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Box,
  Chip,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';
import * as AiConfigAPI from '@/api/ai/config';
import type { Props } from '../index';

export interface TheFormRef {
  open: (id?: number) => void;
}

const CAPABILITY_OPTIONS = ['text', 'image', 'audio', 'video', 'file'];

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const t = useTranslation();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState<number | undefined>();
    const [form, setForm] = useState({
      name: '',
      provider: 'OpenAI',
      baseUrl: '',
      apiKey: '',
      model: '',
      capabilities: [] as string[],
      isDefault: false,
      isEnabled: true,
      remark: '',
    });

    useImperativeHandle(ref, () => ({
      open: async (editId?: number) => {
        setId(editId);
        if (editId) {
          try {
            const res = await AiConfigAPI.getFn({ data: { id: editId } });
            const data = res.data?.data;
            if (data) {
              setForm({
                name: data.name || '',
                provider: data.provider || 'OpenAI',
                baseUrl: data.baseUrl || '',
                apiKey: data.apiKey || '',
                model: data.model || '',
                capabilities: JSON.parse(data.capabilities || '[]'),
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
            provider: 'OpenAI',
            baseUrl: '',
            apiKey: '',
            model: '',
            capabilities: ['text'],
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
        const payload = {
          ...form,
          capabilities: JSON.stringify(form.capabilities),
        };
        if (id) {
          await AiConfigAPI.updateFn({ data: { ...payload, id } });
        } else {
          await AiConfigAPI.addFn({ data: payload });
        }
        setVisible(false);
        tableRef.current?.refresh();
        showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
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
                label={t('ai.config.name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <TextField
                select
                fullWidth
                label={t('ai.config.provider')}
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              >
                <MenuItem value="OpenAI">OpenAI</MenuItem>
                <MenuItem value="DeepSeek">DeepSeek</MenuItem>
                <MenuItem value="Ollama">Ollama</MenuItem>
                <MenuItem value="Anthropic">Anthropic</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                label={t('ai.config.model')}
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('ai.config.baseUrl')}
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                type="password"
                label={t('ai.config.apiKey')}
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>{t('ai.config.capabilities')}</InputLabel>
                <Select
                  multiple
                  value={form.capabilities}
                  onChange={(e) => setForm({ ...form, capabilities: e.target.value as string[] })}
                  input={<OutlinedInput label={t('ai.config.capabilities')} />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {CAPABILITY_OPTIONS.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  />
                }
                label={t('ai.config.isDefault')}
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
