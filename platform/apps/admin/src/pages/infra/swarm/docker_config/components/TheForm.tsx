import React from 'react';
import { FormControlLabel, Switch, Grid } from '@mui/material';
import { TextField } from '@/components/Form';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { ListDockerConfigReq } from '@/api/infra/swarm/type';
import type { SwarmDockerConfigRes } from './TheTable';

export const formConfig: SchemaCrudConfig<
  SwarmDockerConfigRes,
  FilterState,
  ListDockerConfigReq
>['form'] = {
  schema: 'infra.swarm.docker_configAddReq',
  updateSchema: 'infra.swarm.docker_configUpdateReq',
  defaultForm: {
    name: '',
    host: '',
    apiVersion: '',
    tlsVerify: false,
    caCert: '',
    clientCert: '',
    clientKey: '',
    cfMtlsBinding: '',
    isDefault: false,
    isEnabled: true,
    remark: '',
  },
  renderForm: (form, setForm, _isMobile, t) => renderDockerConfigForm(form, setForm, t),
};

function renderDockerConfigForm(
  form: Partial<SwarmDockerConfigRes>,
  setForm: React.Dispatch<React.SetStateAction<Partial<SwarmDockerConfigRes>>>,
  t: (key: string) => string,
) {
  return (
    <Grid container spacing={2} sx={{ pt: 1 }}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          name="name"
          fullWidth
          label={t('swarm.docker_config.name')}
          value={form.name ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          name="apiVersion"
          fullWidth
          label={t('swarm.docker_config.apiVersion')}
          value={form.apiVersion ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, apiVersion: e.target.value }))}
          placeholder="v1.45"
        />
      </Grid>
      <Grid size={12}>
        <TextField
          name="host"
          fullWidth
          label={t('swarm.docker_config.host')}
          value={form.host ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
          placeholder={t('swarm.docker_config.hostPlaceholder')}
          required
        />
      </Grid>

      <Grid size={12}>
        <FormControlLabel
          control={
            <Switch
              checked={!!form.tlsVerify}
              onChange={(e) => setForm((prev) => ({ ...prev, tlsVerify: e.target.checked }))}
            />
          }
          label={t('swarm.docker_config.tlsVerify')}
        />
      </Grid>

      {form.tlsVerify && (
        <>
          <Grid size={12}>
            <TextField
              name="cfMtlsBinding"
              fullWidth
              label={t('swarm.docker_config.cfMtlsBinding')}
              value={form.cfMtlsBinding ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, cfMtlsBinding: e.target.value }))}
              placeholder={t('swarm.docker_config.cfMtlsBindingPlaceholder')}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              name="caCert"
              fullWidth
              multiline
              rows={4}
              label={t('swarm.docker_config.caCert')}
              value={form.caCert ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, caCert: e.target.value }))}
              placeholder="-----BEGIN CERTIFICATE-----\n..."
            />
          </Grid>
          <Grid size={12}>
            <TextField
              name="clientCert"
              fullWidth
              multiline
              rows={4}
              label={t('swarm.docker_config.clientCert')}
              value={form.clientCert ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, clientCert: e.target.value }))}
              placeholder="-----BEGIN CERTIFICATE-----\n..."
            />
          </Grid>
          <Grid size={12}>
            <TextField
              name="clientKey"
              fullWidth
              multiline
              rows={4}
              type="password"
              label={t('swarm.docker_config.clientKey')}
              value={form.clientKey ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, clientKey: e.target.value }))}
              placeholder="-----BEGIN PRIVATE KEY-----\n..."
            />
          </Grid>
        </>
      )}

      <Grid size={12}>
        <TextField
          name="remark"
          fullWidth
          multiline
          rows={2}
          label={t('column.remark')}
          value={form.remark ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
        />
      </Grid>

      <Grid size={6}>
        <FormControlLabel
          control={
            <Switch
              checked={!!form.isDefault}
              onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            />
          }
          label={t('swarm.docker_config.isDefaultForm')}
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
