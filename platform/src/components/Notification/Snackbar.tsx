import { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  ThemeProvider,
  createTheme,
  type AlertColor,
} from '@mui/material';

const theme = createTheme();

export interface SnackbarOptions {
  message: string;
  type?: AlertColor;
  duration?: number;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export interface SnackbarNotificationProps extends SnackbarOptions {
  onExited: () => void;
}

export const SnackbarNotification = ({
  message,
  type = 'info',
  duration = 3000,
  position = { vertical: 'bottom', horizontal: 'right' },
  onExited,
}: SnackbarNotificationProps) => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={handleClose}
        anchorOrigin={position}
        TransitionProps={{
          onExited: onExited,
        }}
      >
        <Alert 
          onClose={handleClose} 
          severity={type} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};
