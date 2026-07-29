import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Divider,
} from '@mui/material';
import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ParticipantItem {
  _mapKey?: string;
  peerId?: string;
  id?: string;
  displayName?: string;
  userId?: string;
  flags?: { presetName?: string };
  presetName?: string;
}

interface RTKParticipantsApi {
  waitlisted?: Map<string, ParticipantItem>;
  joined?: Map<string, ParticipantItem>;
  acceptWaitingRoomRequest?: (peerId: string) => void;
}

interface RTKMeetingInstance {
  participants?: RTKParticipantsApi;
  admit?: (peerId: string) => void;
  self?: {
    peerId?: string;
    presetName?: string;
    flags?: { presetName?: string };
  };
}

interface ParticipantPanelProps {
  meeting: RTKMeetingInstance | null | undefined;
}

interface SelectorState {
  participants?: RTKParticipantsApi;
  self?: {
    peerId?: string;
    presetName?: string;
    flags?: { presetName?: string };
  };
}

export function ParticipantPanel({ meeting }: ParticipantPanelProps) {
  const t = useTranslation();

  const participantsMap = useRealtimeKitSelector((m: SelectorState) => {
    return {
      waitlisted: m.participants?.waitlisted || new Map<string, ParticipantItem>(),
      joined: m.participants?.joined || new Map<string, ParticipantItem>(),
    };
  });

  const selfPeerId = useRealtimeKitSelector((m: SelectorState) => m.self?.peerId);
  const selfPreset = useRealtimeKitSelector(
    (m: SelectorState) => m.self?.flags?.presetName || m.self?.presetName,
  );

  const isHost = selfPreset === 'group_call_host';

  const waitlisted: ParticipantItem[] = [];
  if (typeof participantsMap.waitlisted.forEach === 'function') {
    participantsMap.waitlisted.forEach((v, k) => waitlisted.push({ ...v, _mapKey: k }));
  }

  const active: ParticipantItem[] = [];
  if (typeof participantsMap.joined.forEach === 'function') {
    participantsMap.joined.forEach((v, k) => active.push({ ...v, _mapKey: k }));
  }

  const handleAdmit = (peerId?: string) => {
    if (!peerId) return;

    if (
      meeting?.participants &&
      typeof meeting.participants.acceptWaitingRoomRequest === 'function'
    ) {
      meeting.participants.acceptWaitingRoomRequest(peerId);
    } else if (meeting && typeof meeting.admit === 'function') {
      meeting.admit(peerId);
    }
  };

  return (
    <Box
      sx={{
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">{t('voice.participant.title')}</Typography>
      </Box>

      {/* 访客等待室 (仅对主持人显示且有等待人员时) */}
      {isHost && waitlisted.length > 0 && (
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
            {t('voice.participant.waiting')} ({waitlisted.length})
          </Typography>
          <List dense>
            {waitlisted.map((p, index) => (
              <ListItem key={p._mapKey || p.peerId || p.id || `waitlist-${index}`}>
                <ListItemText primary={p.displayName || p.userId || t('voice.participant.guest')} />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleAdmit(p.peerId || p._mapKey)}
                  >
                    {t('voice.participant.admit')}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      )}

      {/* 已加入成员 */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
          {t('voice.participant.joined')} ({active.length})
        </Typography>
        <List dense>
          {active.map((p, index) => (
            <ListItem key={p._mapKey || p.peerId || p.id || `active-${index}`}>
              <ListItemText
                primary={p.displayName || p.userId || t('voice.participant.guest')}
                secondary={
                  p.peerId === selfPeerId
                    ? t('voice.participant.self')
                    : p?.flags?.presetName === 'group_call_host' ||
                        p?.presetName === 'group_call_host'
                      ? t('voice.participant.host')
                      : ''
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}
