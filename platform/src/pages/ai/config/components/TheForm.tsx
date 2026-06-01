import React from 'react';
import {
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

import type { AiConfigRes } from './TheTable';

export interface AiConfigFormFieldsProps {
  form: Partial<AiConfigRes & { _capabilitiesArr?: string[] }>;
  setForm: React.Dispatch<
    React.SetStateAction<Partial<AiConfigRes & { _capabilitiesArr?: string[] }>>
  >;
  t: (key: string) => string;
}

const CAPABILITY_OPTIONS = ['text', 'image', 'audio', 'video', 'file'];

export default function AiConfigFormFields({ form, setForm, t }: AiConfigFormFieldsProps) {
  const capabilities = form._capabilitiesArr || [];

  return (
    <Grid container spacing={2} sx={{ pt: 1 }}>
      <Grid size={12}>
        <TextField
          fullWidth
          label={t('ai.config.name')}
          value={form.name ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
      </Grid>
      <Grid size={6}>
        <TextField
          select
          fullWidth
          label={t('ai.config.provider')}
          value={form.provider || 'OpenAI'}
          onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
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
          value={form.model ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
          required
        />
      </Grid>
      <Grid size={12}>
        <TextField
          fullWidth
          label={t('ai.config.baseUrl')}
          value={form.baseUrl ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
          placeholder="https://api.openai.com/v1"
        />
      </Grid>
      <Grid size={12}>
        <TextField
          fullWidth
          type="password"
          label={t('ai.config.apiKey')}
          value={form.apiKey ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
          required
        />
      </Grid>
      <Grid size={12}>
        <FormControl fullWidth>
          <InputLabel>{t('ai.config.capabilities')}</InputLabel>
          <Select
            multiple
            value={capabilities}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, _capabilitiesArr: e.target.value as string[] }))
            }
            input={<OutlinedInput label={t('ai.config.capabilities')} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
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
              checked={!!form.isDefault}
              onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            />
          }
          label={t('ai.config.isDefault')}
        />
      </Grid>
      <Grid size={6}>
        <FormControlLabel
          control={
            <Switch
              checked={!!form.isEnabled}
              onChange={(e) => setForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
            />
          }
          label={t('status.enabled')}
        />
      </Grid>
    </Grid>
  );
}
