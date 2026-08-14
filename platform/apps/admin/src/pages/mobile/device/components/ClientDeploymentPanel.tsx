import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import * as DeploymentAPI from '@/api/admin/mobile/client-deployment';
import type {
  ClientDeployment,
  ClientDeploymentActivationMode,
  ClientEnvironmentName,
  ClientEnvironmentRevision,
  ClientRelease,
} from '@/api/admin/mobile/client-deployment';
import { showSnackbar } from '@/components/Notification';
import { ResponsiveButton } from '@/components/Responsive';
import { permissions } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';

interface ClientDeploymentPanelProps {
  clientId: string;
}

const TERMINAL_PHASES = new Set(['SUCCEEDED', 'FAILED', 'ROLLED_BACK', 'TIMED_OUT', 'CANCELLED']);

/** 根据部署终态选择颜色。 */
function phaseColor(phase: ClientDeployment['phase']): 'success' | 'error' | 'warning' | 'info' {
  if (phase === 'SUCCEEDED') return 'success';
  if (phase === 'FAILED' || phase === 'TIMED_OUT') return 'error';
  if (phase === 'ROLLED_BACK' || phase === 'CANCELLED') return 'warning';
  return 'info';
}

/** 设备版本、环境修订和部署历史控制面。 */
export function ClientDeploymentPanel({ clientId }: ClientDeploymentPanelProps) {
  const t = useTranslation();
  const [releases, setReleases] = useState<ClientRelease[]>([]);
  const [environments, setEnvironments] = useState<ClientEnvironmentRevision[]>([]);
  const [deployments, setDeployments] = useState<ClientDeployment[]>([]);
  const [releaseVersion, setReleaseVersion] = useState('');
  const [environment, setEnvironment] = useState<ClientEnvironmentName>('development');
  const [activationMode, setActivationMode] = useState<ClientDeploymentActivationMode>('GRACEFUL');
  const [submitting, setSubmitting] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<ClientEnvironmentRevision | null>(
    null,
  );
  const [configText, setConfigText] = useState('{}');
  const [secretKeysText, setSecretKeysText] = useState('');

  const publishedReleases = useMemo(
    () => releases.filter((release) => release.status === 'PUBLISHED'),
    [releases],
  );

  const load = useCallback(async () => {
    const [releaseResponse, environmentResponse, deploymentResponse] = await Promise.all([
      DeploymentAPI.listClientReleases(),
      DeploymentAPI.listClientEnvironments(),
      DeploymentAPI.listClientDeployments({ clientId }),
    ]);
    const nextReleases = releaseResponse.data.data.list;
    setReleases(nextReleases);
    setEnvironments(environmentResponse.data.data);
    setDeployments(deploymentResponse.data.data.list);
    setReleaseVersion((current) => {
      if (nextReleases.some((release) => release.releaseVersion === current)) return current;
      return nextReleases.find((release) => release.status === 'PUBLISHED')?.releaseVersion ?? '';
    });
  }, [clientId]);

  useEffect(() => {
    void load().catch(() => undefined);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load().catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const apply = async () => {
    if (!releaseVersion) return;
    const forceConfirmed =
      activationMode !== 'FORCE' || window.confirm(t('mobile.deployment.forceConfirm'));
    if (!forceConfirmed) return;
    setSubmitting(true);
    try {
      const response = await DeploymentAPI.applyClientDeployment({
        clientId,
        releaseVersion,
        environment,
        activationMode,
        forceConfirmed,
      });
      showSnackbar({
        message: `${t('mobile.deployment.accepted')}: ${response.data.data.deploymentId}`,
        type: 'success',
      });
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const rollback = async (deploymentId: string) => {
    if (!window.confirm(t('mobile.deployment.rollbackConfirm'))) return;
    await DeploymentAPI.rollbackClientDeployment({ deploymentId });
    showSnackbar({ message: t('mobile.deployment.rollbackAccepted'), type: 'success' });
    await load();
  };

  const revoke = async (version: string) => {
    if (!window.confirm(t('mobile.deployment.revokeConfirm'))) return;
    await DeploymentAPI.revokeClientRelease(version);
    await load();
  };

  const openEnvironmentEditor = (item: ClientEnvironmentRevision) => {
    setEditingEnvironment(item);
    setConfigText(JSON.stringify(item.config, null, 2));
    setSecretKeysText(item.requiredSecretKeys.join('\n'));
  };

  const saveEnvironment = async () => {
    if (!editingEnvironment) return;
    let config: unknown;
    try {
      config = JSON.parse(configText) as unknown;
    } catch {
      showSnackbar({ message: t('mobile.deployment.invalidJson'), type: 'error' });
      return;
    }
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      showSnackbar({ message: t('mobile.deployment.invalidJson'), type: 'error' });
      return;
    }
    await DeploymentAPI.updateClientEnvironment({
      environment: editingEnvironment.name,
      config: config as Record<string, unknown>,
      requiredSecretKeys: secretKeysText
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean),
    });
    setEditingEnvironment(null);
    showSnackbar({ message: t('mobile.deployment.environmentSaved'), type: 'success' });
    await load();
  };

  return (
    <Stack spacing={3} sx={{ mt: 3 }}>
      <Alert severity="info">{t('mobile.deployment.isolationHint')}</Alert>

      <Box>
        <Typography variant="subtitle1">{t('mobile.deployment.applyTitle')}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('mobile.deployment.release')}
            value={releaseVersion}
            onChange={(event) => setReleaseVersion(event.target.value)}
            sx={{ minWidth: 170 }}
            slotProps={{ select: { native: true } }}
          >
            <option value="" />
            {publishedReleases.map((release) => (
              <option value={release.releaseVersion} key={release.id}>
                {release.releaseVersion}
              </option>
            ))}
          </TextField>
          <TextField
            select
            label={t('mobile.deployment.environment')}
            value={environment}
            onChange={(event) => setEnvironment(event.target.value as ClientEnvironmentName)}
            sx={{ minWidth: 170 }}
            slotProps={{ select: { native: true } }}
          >
            {environments.map((item) => (
              <option value={item.name} key={item.id}>
                {item.name} / r{item.revision}
              </option>
            ))}
          </TextField>
          <TextField
            select
            label={t('mobile.deployment.activationMode')}
            value={activationMode}
            onChange={(event) =>
              setActivationMode(event.target.value as ClientDeploymentActivationMode)
            }
            sx={{ minWidth: 150 }}
            slotProps={{ select: { native: true } }}
          >
            <option value="GRACEFUL">GRACEFUL</option>
            <option value="FORCE">FORCE</option>
          </TextField>
          <ResponsiveButton
            permissionCodes={[permissions.admin.mobile.client_deployment.dispatch]}
            disabled={!releaseVersion || submitting}
            onClick={() => void apply()}
          >
            {t('mobile.deployment.apply')}
          </ResponsiveButton>
        </Stack>
      </Box>

      <Divider />
      <Box>
        <Typography variant="subtitle1">{t('mobile.deployment.environments')}</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {environments.map((item) => (
            <Stack
              key={item.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Typography>
                {item.name} / r{item.revision} / {item.requiredSecretKeys.length}{' '}
                {t('mobile.deployment.secretKeys')}
              </Typography>
              <ResponsiveButton
                size="small"
                variant="outlined"
                permissionCodes={[permissions.admin.mobile.client_environment.dispatch]}
                onClick={() => openEnvironmentEditor(item)}
              >
                {t('common.edit')}
              </ResponsiveButton>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider />
      <Box>
        <Typography variant="subtitle1">{t('mobile.deployment.releases')}</Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {releases.map((release) => (
            <Stack
              key={release.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography>{release.releaseVersion}</Typography>
                <Chip
                  size="small"
                  color={release.status === 'PUBLISHED' ? 'success' : 'warning'}
                  label={release.status}
                />
                <Typography variant="caption" color="text.secondary">
                  {release.artifactSha256.slice(0, 12)}
                </Typography>
              </Stack>
              {release.status === 'PUBLISHED' && (
                <ResponsiveButton
                  size="small"
                  color="warning"
                  variant="outlined"
                  permissionCodes={[permissions.admin.mobile.client_release.dispatch]}
                  onClick={() => void revoke(release.releaseVersion)}
                >
                  {t('mobile.deployment.revoke')}
                </ResponsiveButton>
              )}
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider />
      <Box>
        <Typography variant="subtitle1">{t('mobile.deployment.history')}</Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {deployments.length === 0 && (
            <Alert severity="info">{t('mobile.deployment.empty')}</Alert>
          )}
          {deployments.map((item) => (
            <Box
              key={item.deploymentId}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" color={phaseColor(item.phase)} label={item.phase} />
                <Typography>{item.releaseVersion}</Typography>
                <Typography>
                  {item.environment}/r{item.environmentRevision}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(item.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')}
                </Typography>
              </Stack>
              {(item.resultCode || item.resultMessage) && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {item.resultCode}: {item.resultMessage}
                </Typography>
              )}
              {TERMINAL_PHASES.has(item.phase) && item.previousReleaseVersion && (
                <ResponsiveButton
                  size="small"
                  variant="text"
                  permissionCodes={[permissions.admin.mobile.client_deployment.dispatch]}
                  onClick={() => void rollback(item.deploymentId)}
                >
                  {t('mobile.deployment.rollback')}
                </ResponsiveButton>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      <Dialog
        open={editingEnvironment !== null}
        onClose={() => setEditingEnvironment(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('mobile.deployment.editEnvironment')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">{t('mobile.deployment.environmentWarning')}</Alert>
            <TextField
              label={t('mobile.deployment.configJson')}
              value={configText}
              onChange={(event) => setConfigText(event.target.value)}
              multiline
              minRows={10}
              fullWidth
            />
            <TextField
              label={t('mobile.deployment.requiredSecretKeys')}
              helperText={t('mobile.deployment.requiredSecretKeysHint')}
              value={secretKeysText}
              onChange={(event) => setSecretKeysText(event.target.value)}
              multiline
              minRows={4}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <ResponsiveButton variant="outlined" onClick={() => setEditingEnvironment(null)}>
            {t('common.cancel')}
          </ResponsiveButton>
          <ResponsiveButton
            permissionCodes={[permissions.admin.mobile.client_environment.dispatch]}
            onClick={() => void saveEnvironment()}
          >
            {t('common.save')}
          </ResponsiveButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
