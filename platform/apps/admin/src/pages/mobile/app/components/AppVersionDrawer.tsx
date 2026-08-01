import { Drawer, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AppVersionPage from '../../app-version/index';

interface AppVersionDrawerProps {
  open: boolean;
  onClose: () => void;
  appId: number | null;
  appName: string;
}

export default function AppVersionDrawer({ open, onClose, appId, appName }: AppVersionDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: '80%', maxWidth: 1000 } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">App Versions - {appName}</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ p: 2, height: 'calc(100vh - 65px)', overflowY: 'auto' }}>
        {appId ? <AppVersionPage appId={appId} /> : null}
      </Box>
    </Drawer>
  );
}
