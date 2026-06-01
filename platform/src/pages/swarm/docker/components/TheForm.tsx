import React from 'react';
import {
  TextField,
  Grid,
  Button,
  IconButton,
  Typography,
  Box,
  Divider,
  MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

export interface EnvPair {
  key: string;
  value: string;
}

export interface PortMapping {
  Protocol: 'tcp' | 'udp';
  PublishedPort: number;
  TargetPort: number;
}

export interface SwarmFormState {
  Name: string;
  Image: string;
  Replicas: number;
  EnvPairs: EnvPair[];
  PortMappings: PortMapping[];
}

export interface TheFormProps {
  form: Partial<SwarmFormState>;
  setForm: React.Dispatch<React.SetStateAction<Partial<SwarmFormState>>>;
  t: (key: string) => string;
}

export default function TheForm({ form, setForm, t }: TheFormProps) {
  const envPairs = form.EnvPairs || [];
  const portMappings = form.PortMappings || [];

  const handleAddEnv = () => {
    setForm((prev) => ({
      ...prev,
      EnvPairs: [...(prev.EnvPairs || []), { key: '', value: '' }],
    }));
  };

  const handleRemoveEnv = (index: number) => {
    setForm((prev) => ({
      ...prev,
      EnvPairs: (prev.EnvPairs || []).filter((_, i) => i !== index),
    }));
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', value: string) => {
    setForm((prev) => {
      const updated = [...(prev.EnvPairs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, EnvPairs: updated };
    });
  };

  const handleAddPort = () => {
    setForm((prev) => ({
      ...prev,
      PortMappings: [
        ...(prev.PortMappings || []),
        { Protocol: 'tcp', PublishedPort: 80, TargetPort: 80 },
      ],
    }));
  };

  const handleRemovePort = (index: number) => {
    setForm((prev) => ({
      ...prev,
      PortMappings: (prev.PortMappings || []).filter((_, i) => i !== index),
    }));
  };

  const handlePortChange = (index: number, field: keyof PortMapping, value: string) => {
    setForm((prev) => {
      const updated = [...(prev.PortMappings || [])];
      if (field === 'PublishedPort' || field === 'TargetPort') {
        updated[index] = { ...updated[index], [field]: parseInt(value) || 0 };
      } else {
        updated[index] = { ...updated[index], [field]: value as 'tcp' | 'udp' };
      }
      return { ...prev, PortMappings: updated };
    });
  };

  return (
    <Grid container spacing={2} sx={{ pt: 1 }}>
      <Grid size={12}>
        <TextField
          fullWidth
          label={t('swarm.docker.name')}
          placeholder={t('swarm.docker.namePlaceholder')}
          value={form.Name ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, Name: e.target.value }))}
          required
        />
      </Grid>
      <Grid size={8}>
        <TextField
          fullWidth
          label={t('swarm.docker.image')}
          placeholder={t('swarm.docker.imagePlaceholder')}
          value={form.Image ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, Image: e.target.value }))}
          required
        />
      </Grid>
      <Grid size={4}>
        <TextField
          fullWidth
          type="number"
          label={t('swarm.docker.replicas')}
          slotProps={{ htmlInput: { min: 1, max: 100 } }}
          value={form.Replicas ?? 1}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, Replicas: parseInt(e.target.value) || 1 }))
          }
          required
        />
      </Grid>

      {/* 环境变量配置区 */}
      <Grid size={12}>
        <Box sx={{ mt: 1, mb: 1 }}>
          <Divider sx={{ mb: 1 }} />
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {t('swarm.docker.environment')}
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddEnv} variant="outlined">
              {t('swarm.docker.addEnv')}
            </Button>
          </Box>

          {envPairs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
              {t('swarm.docker.noEnv')}
            </Typography>
          ) : (
            envPairs.map((pair, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label={t('swarm.docker.key')}
                  placeholder={t('swarm.docker.keyPlaceholder')}
                  value={pair.key}
                  onChange={(e) => handleEnvChange(index, 'key', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label={t('swarm.docker.value')}
                  placeholder={t('swarm.docker.valuePlaceholder')}
                  value={pair.value}
                  onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
                  sx={{ flex: 2 }}
                />
                <IconButton color="error" size="small" onClick={() => handleRemoveEnv(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </Grid>

      {/* 暴露端口映射配置区 */}
      <Grid size={12}>
        <Box sx={{ mt: 1, mb: 1 }}>
          <Divider sx={{ mb: 1 }} />
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {t('swarm.docker.ports')}
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddPort} variant="outlined">
              {t('swarm.docker.addPort')}
            </Button>
          </Box>

          {portMappings.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 1 }}>
              {t('swarm.docker.noPorts')}
            </Typography>
          ) : (
            portMappings.map((mapping, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  select
                  size="small"
                  label={t('swarm.docker.protocol')}
                  value={mapping.Protocol}
                  onChange={(e) => handlePortChange(index, 'Protocol', e.target.value)}
                  sx={{ width: 100 }}
                >
                  <MenuItem value="tcp">TCP</MenuItem>
                  <MenuItem value="udp">UDP</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label={t('swarm.docker.pubPort')}
                  placeholder={t('swarm.docker.pubPortPlaceholder')}
                  value={mapping.PublishedPort || ''}
                  onChange={(e) => handlePortChange(index, 'PublishedPort', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label={t('swarm.docker.targetPort')}
                  placeholder={t('swarm.docker.targetPortPlaceholder')}
                  value={mapping.TargetPort || ''}
                  onChange={(e) => handlePortChange(index, 'TargetPort', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton color="error" size="small" onClick={() => handleRemovePort(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </Grid>
    </Grid>
  );
}
