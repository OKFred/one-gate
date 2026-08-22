import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import * as NetworkRoutingAPI from '@/api/admin/mobile/network-routing';
import type { NetworkRoutingTarget, NetworkRoutingView } from '@/api/admin/mobile/network-routing';
import { showSnackbar } from '@/components/Notification';
import { ResponsiveButton } from '@/components/Responsive';
import { permissions } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  clientId: string;
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function chipColor(state: NetworkRoutingView['state']) {
  if (state === 'ACTIVE') return 'success' as const;
  if (state === 'APPLYING') return 'info' as const;
  if (state === 'FAILED' || state === 'ROLLBACK_FAILED') return 'error' as const;
  if (state === 'DEGRADED') return 'warning' as const;
  return 'default' as const;
}

/** 每设备 Wi-Fi/中国电信持久网络分流控制面。 */
export function NetworkRoutingPanel({ clientId }: Props) {
  const t = useTranslation();
  const [routing, setRouting] = useState<NetworkRoutingView | null>(null);
  const [cidrs, setCidrs] = useState('');
  const [lanProbes, setLanProbes] = useState('');
  const [internetProbe, setInternetProbe] = useState('');
  const [probeTimeoutMs, setProbeTimeoutMs] = useState(10_000);
  const [target, setTarget] = useState<NetworkRoutingTarget>('wifi');
  const [saving, setSaving] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const rollbackResult =
    routing?.lastResult && typeof routing.lastResult.rollback === 'object'
      ? routing.lastResult.rollback
      : null;

  const load = useCallback(async () => {
    const response = await NetworkRoutingAPI.getNetworkRouting(clientId);
    const next = response.data.data as NetworkRoutingView;
    setRouting(next);
    setCidrs(next.lanCidrs.join('\n'));
    setLanProbes(next.lanProbeUrls.join('\n'));
    setInternetProbe(next.internetProbeUrl);
    setProbeTimeoutMs(next.probeTimeoutMs);
    setTarget(next.desiredTarget ?? next.actualTarget ?? 'wifi');
  }, [clientId]);

  useEffect(() => {
    void load().catch(() => undefined);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load().catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const save = async () => {
    if (saving || routing?.state === 'APPLYING') return;
    setSaving(true);
    try {
      await NetworkRoutingAPI.updateNetworkRouting({
        clientId,
        lanCidrs: lines(cidrs),
        lanProbeUrls: lines(lanProbes),
        internetProbeUrl: internetProbe.trim(),
        probeTimeoutMs,
      });
      showSnackbar({ message: t('mobile.networkRouting.saved'), type: 'success' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const apply = async () => {
    if (saving || routing?.state === 'APPLYING') return;
    setSaving(true);
    try {
      const response = await NetworkRoutingAPI.applyNetworkRouting({
        clientId,
        internetTarget: target,
      });
      showSnackbar({
        message: `${t('mobile.networkRouting.accepted')}: ${response.data.data.taskId}`,
        type: 'success',
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await NetworkRoutingAPI.disableNetworkRouting(clientId);
      setDisableOpen(false);
      showSnackbar({ message: t('mobile.networkRouting.disableAccepted'), type: 'success' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!routing) return <Typography sx={{ mt: 3 }}>{t('common.loading')}</Typography>;

  return (
    <Stack spacing={3} sx={{ mt: 3 }}>
      <Alert severity="info">{t('mobile.networkRouting.hint')}</Alert>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip label={routing.state} color={chipColor(routing.state)} />
        <Chip label={`${t('mobile.networkRouting.desired')}: ${routing.desiredTarget ?? '-'}`} />
        <Chip label={`${t('mobile.networkRouting.actual')}: ${routing.actualTarget ?? '-'}`} />
        <Chip label={`r${routing.policyRevision} / g${routing.generation}`} />
      </Stack>

      {(routing.lastErrorCode || routing.state === 'DEGRADED') && (
        <Alert severity={routing.state === 'DEGRADED' ? 'warning' : 'error'}>
          {routing.lastErrorCode ?? 'DEGRADED'}
          {rollbackResult !== null && (
            <Box component="span"> · rollback: {JSON.stringify(rollbackResult)}</Box>
          )}
        </Alert>
      )}

      <TextField
        label={t('mobile.networkRouting.cidrs')}
        helperText={t('mobile.networkRouting.cidrsHint')}
        value={cidrs}
        onChange={(event) => setCidrs(event.target.value)}
        multiline
        minRows={3}
      />
      <TextField
        label={t('mobile.networkRouting.lanProbes')}
        value={lanProbes}
        onChange={(event) => setLanProbes(event.target.value)}
        multiline
        minRows={3}
      />
      <TextField
        label={t('mobile.networkRouting.internetProbe')}
        value={internetProbe}
        onChange={(event) => setInternetProbe(event.target.value)}
      />
      <TextField
        type="number"
        label={t('mobile.networkRouting.timeout')}
        value={probeTimeoutMs}
        onChange={(event) => setProbeTimeoutMs(Number(event.target.value))}
        slotProps={{ htmlInput: { min: 3000, max: 30000, step: 1000 } }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          select
          label={t('mobile.networkRouting.target')}
          value={target}
          onChange={(event) => setTarget(event.target.value as NetworkRoutingTarget)}
          sx={{ minWidth: 220 }}
          slotProps={{ select: { native: true } }}
        >
          <option value="wifi">Wi-Fi</option>
          <option value="carrier">中国电信 (46011)</option>
        </TextField>
        <ResponsiveButton
          variant="outlined"
          disabled={saving || routing.state === 'APPLYING'}
          permissionCodes={[permissions.admin.mobile.network_routing.edit]}
          onClick={() => void save()}
        >
          {t('common.save')}
        </ResponsiveButton>
        <ResponsiveButton
          disabled={saving || routing.state === 'APPLYING'}
          permissionCodes={[permissions.admin.mobile.network_routing.edit]}
          onClick={() => void apply()}
        >
          {t('mobile.networkRouting.apply')}
        </ResponsiveButton>
        <ResponsiveButton
          color="warning"
          variant="outlined"
          disabled={saving || routing.state === 'APPLYING' || routing.state === 'DISABLED'}
          permissionCodes={[permissions.admin.mobile.network_routing.edit]}
          onClick={() => setDisableOpen(true)}
        >
          {t('mobile.networkRouting.disable')}
        </ResponsiveButton>
      </Stack>

      {routing.lastTaskId && (
        <Typography variant="body2" color="text.secondary">
          task: {routing.lastTaskId}
          {routing.lastVerifiedTimeUtc
            ? ` · ${dayjs(routing.lastVerifiedTimeUtc).format('YYYY-MM-DD HH:mm:ss')}`
            : ''}
        </Typography>
      )}

      <Dialog open={disableOpen} onClose={() => setDisableOpen(false)}>
        <DialogTitle>{t('mobile.networkRouting.disable')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning">{t('mobile.networkRouting.disableConfirm')}</Alert>
        </DialogContent>
        <DialogActions>
          <ResponsiveButton variant="outlined" onClick={() => setDisableOpen(false)}>
            {t('common.cancel')}
          </ResponsiveButton>
          <ResponsiveButton color="warning" disabled={saving} onClick={() => void disable()}>
            {t('mobile.networkRouting.disable')}
          </ResponsiveButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
