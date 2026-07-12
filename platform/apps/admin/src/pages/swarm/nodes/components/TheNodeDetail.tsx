import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { SwarmNodeObj } from '@/api/admin/swarm/type';

interface TheNodeDetailProps {
  open: boolean;
  node: SwarmNodeObj | null;
  onClose: () => void;
}

export default function TheNodeDetail({ open, node, onClose }: TheNodeDetailProps) {
  const t = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2 },
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {t('swarm.nodes.details')} - {node?.hostname || node?.id}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2, bgcolor: 'background.default' }}>
        <Box
          component="pre"
          sx={{
            margin: 0,
            p: 2,
            fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            bgcolor: 'action.hover',
            borderRadius: 1,
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {node?.rawJson || ''}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} variant="contained" sx={{ px: 3 }}>
          {t('swarm.docker.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
