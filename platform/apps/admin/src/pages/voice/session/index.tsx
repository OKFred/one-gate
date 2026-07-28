import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Stack,
} from '@mui/material';
import {
  Call as CallIcon,
  CallEnd as CallEndIcon,
  VideoCall as VideoCallIcon,
  Refresh as RefreshIcon,
  PeopleAlt as PeopleIcon,
} from '@mui/icons-material';
import { RealtimeKitProvider } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import { useVoiceSession } from '../useVoiceSession';
import * as VoiceAPI from '@/api/admin/voice';
import { ParticipantPanel } from './ParticipantPanel';

interface SessionRow {
  id: number;
  meetingId: string;
  meetingTitle: string | null;
  status: string;
  taskId: string;
  creatorId: number;
  createTimeUtc: number;
  endTimeUtc: number | null;
}

export default function VoiceSessionPage() {
  const t = useTranslation();
  const { meeting, joining, activeSession, startCall, endCall, joinCall } = useVoiceSession();

  const [titleInput, setTitleInput] = useState('');
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // ---------- 历史记录 State ----------
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'ended'>('');

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await VoiceAPI.listSessionsFn({
        data: {
          page: 1,
          pageSize: 50,
          status: statusFilter || undefined,
        },
      });
      if (res?.data?.data?.list) {
        setSessions(res.data.data.list as unknown as SessionRow[]);
      }
    } catch {
    } finally {
      setLoadingSessions(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 通话结束后自动刷新历史记录
  useEffect(() => {
    if (!activeSession) {
      fetchSessions();
    }
  }, [activeSession, fetchSessions]);

  const handleStartCall = async () => {
    setStartDialogOpen(false);
    await startCall({ title: titleInput.trim() || undefined });
    setTitleInput('');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* 页头 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <VideoCallIcon sx={{ fontSize: 36, color: 'primary.main', mr: 1.5 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {t('voice.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('voice.subtitle')}
          </Typography>
        </Box>
      </Box>

      {/* ── 通话区域 ── */}
      {activeSession && meeting ? (
        /* 通话进行中：渲染 RealtimeKit UI */
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 2,
            border: 2,
            borderColor: 'success.main',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 3,
              py: 1.5,
              bgcolor: 'success.dark',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                label={t('voice.activeStatus')}
                color="success"
                size="small"
                sx={{ fontWeight: 'bold', color: 'white', bgcolor: 'success.light' }}
              />
              {activeSession?.meetingId && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}
                >
                  ID: {activeSession.meetingId}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PeopleIcon />}
                onClick={() => setPanelOpen(true)}
                size="small"
              >
                {t('voice.participant.title')}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<CallEndIcon />}
                onClick={endCall}
                size="small"
              >
                {t('voice.endCall')}
              </Button>
            </Stack>
          </Box>

          <RealtimeKitProvider value={meeting}>
            <Box sx={{ height: 600, bgcolor: 'black' }}>
              <RtkMeeting meeting={meeting} mode="fill" showSetupScreen={true} />
            </Box>

            <Drawer anchor="right" open={panelOpen} onClose={() => setPanelOpen(false)}>
              <ParticipantPanel meeting={meeting!} />
            </Drawer>
          </RealtimeKitProvider>
        </Card>
      ) : (
        /* 空闲状态：发起通话按钮 */
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CallIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2, opacity: 0.8 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
              {t('voice.startCall')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('voice.newCallDesc')}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={joining ? <CircularProgress size={20} color="inherit" /> : <CallIcon />}
              disabled={joining}
              onClick={() => setStartDialogOpen(true)}
              sx={{ minWidth: 160, py: 1.2 }}
            >
              {joining ? t('voice.joining') : t('voice.startCall')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── 历史会话记录 ── */}
      <Card
        elevation={0}
        sx={{ borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {t('voice.session.title')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {(['', 'active', 'ended'] as const).map((s) => (
                <Chip
                  key={s || 'all'}
                  label={
                    s === ''
                      ? t('voice.session.filterAll')
                      : s === 'active'
                        ? t('voice.session.filterActive')
                        : t('voice.session.filterEnded')
                  }
                  size="small"
                  variant={statusFilter === s ? 'filled' : 'outlined'}
                  color={
                    statusFilter === s
                      ? s === 'active'
                        ? 'success'
                        : s === 'ended'
                          ? 'default'
                          : 'primary'
                      : 'default'
                  }
                  onClick={() => setStatusFilter(s)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
              <IconButton size="small" onClick={fetchSessions} disabled={loadingSessions}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell width={70}>{t('voice.session.colId')}</TableCell>
                  <TableCell>{t('voice.session.colTitle')}</TableCell>
                  <TableCell width={220} sx={{ fontFamily: 'monospace' }}>
                    Meeting ID
                  </TableCell>
                  <TableCell width={100}>{t('voice.session.colStatus')}</TableCell>
                  <TableCell width={180}>{t('voice.session.colTime')}</TableCell>
                  <TableCell width={100} align="center">
                    {t('table.actions')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingSessions ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      {t('voice.session.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>
                        {row.meetingTitle || (
                          <Typography variant="body2" color="text.disabled" component="span">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                        }}
                      >
                        {row.meetingId}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            row.status === 'active'
                              ? t('voice.status.active')
                              : t('voice.status.ended')
                          }
                          color={row.status === 'active' ? 'success' : 'default'}
                          variant={row.status === 'active' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                        {row.createTimeUtc
                          ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                          : '--'}
                      </TableCell>
                      <TableCell align="center">
                        {row.status === 'active' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => joinCall(row.meetingId)}
                            disabled={joining || !!activeSession}
                          >
                            {t('voice.join')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── 发起通话对话框 ── */}
      <Dialog
        open={startDialogOpen}
        onClose={() => setStartDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('voice.startCall')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('voice.sessionTitle')}
            placeholder={t('voice.sessionPlaceholder')}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            sx={{ mt: 1 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleStartCall();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStartDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" startIcon={<CallIcon />} onClick={handleStartCall}>
            {t('voice.startCall')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
