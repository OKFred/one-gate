import React from 'react';
import { Snackbar, Alert } from '@mui/material';

export interface NoticeToolProps {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
  onClose: () => void;
  autoHideDuration?: number;
}

const NoticeTool: React.FC<NoticeToolProps> = ({
  open,
  message,
  severity,
  onClose,
  autoHideDuration = 4000,
}) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    onClose={onClose}
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
  >
    <Alert
      onClose={onClose}
      severity={severity}
      sx={{ width: '100%' }}
      variant="filled"
    >
      {message}
    </Alert>
  </Snackbar>
);

export default NoticeTool;
