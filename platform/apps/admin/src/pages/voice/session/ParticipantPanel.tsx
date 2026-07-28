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

interface ParticipantPanelProps {
  meeting: any;
}

export function ParticipantPanel({ meeting }: ParticipantPanelProps) {
  // Try to safely access participants map from RTKClient
  const participantsMap = useRealtimeKitSelector((m: any) => {
    return {
      waitlisted: m.participants?.waitlisted || new Map(),
      joined: m.participants?.joined || new Map(),
    };
  });

  const selfPeerId = useRealtimeKitSelector((m: any) => m.self?.peerId);
  const selfPreset = useRealtimeKitSelector(
    (m: any) => m.self?.flags?.presetName || m.self?.presetName,
  );

  const isHost = selfPreset === 'group_call_host';

  let waitlisted = [] as any[];
  if (typeof participantsMap.waitlisted.forEach === 'function') {
    participantsMap.waitlisted.forEach((v: any, k: any) => waitlisted.push({ ...v, _mapKey: k }));
  }
  let active = [] as any[];
  if (typeof participantsMap.joined.forEach === 'function') {
    participantsMap.joined.forEach((v: any, k: any) => active.push({ ...v, _mapKey: k }));
  }

  const handleAdmit = (peerId: string) => {
    if (
      meeting &&
      meeting.participants &&
      typeof (meeting.participants as any).acceptWaitingRoomRequest === 'function'
    ) {
      (meeting.participants as any).acceptWaitingRoomRequest(peerId);
    } else if (meeting && typeof (meeting as any).admit === 'function') {
      (meeting as any).admit(peerId);
    } else {
      console.warn('Could not find admit function on RTKClient');
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
        <Typography variant="h6">参会人列表</Typography>
      </Box>

      {/* 访客等待室 (仅对主持人显示且有等待人员时) */}
      {isHost && waitlisted.length > 0 && (
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
            等待中 ({waitlisted.length})
          </Typography>
          <List dense>
            {waitlisted.map((p, index) => (
              <ListItem key={p._mapKey || p.peerId || p.id || `waitlist-${index}`}>
                <ListItemText primary={p.displayName || p.userId || 'Guest'} />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleAdmit(p.peerId)}
                  >
                    同意
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
          已加入 ({active.length})
        </Typography>
        <List dense>
          {active.map((p, index) => (
            <ListItem key={p._mapKey || p.peerId || p.id || `active-${index}`}>
              <ListItemText
                primary={p.displayName || p.userId || 'Participant'}
                secondary={
                  p.peerId === selfPeerId
                    ? '(我)'
                    : p?.flags?.presetName === 'group_call_host'
                      ? '主持人'
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
