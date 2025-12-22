import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  ThemeProvider,
  createTheme,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const theme = createTheme();

export interface NotificationOptions {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  callback?: (action: 'confirm' | 'cancel' | 'close') => void;
  beforeClose?: (
    action: 'confirm' | 'cancel' | 'close',
    instance: { close: () => void },
    done: () => void,
  ) => void;
  showClose?: boolean;
}

export interface NotificationDialogProps extends NotificationOptions {
  onExited: () => void;
}

export const NotificationDialog = ({
  message,
  type = 'info',
  title,
  callback,
  beforeClose,
  showClose = true,
  onExited,
}: NotificationDialogProps) => {
  const [open, setOpen] = useState(true);

  const handleAction = (action: 'confirm' | 'cancel' | 'close') => {
    const done = () => {
      setOpen(false);
      if (callback) {
        callback(action);
      }
    };

    if (beforeClose) {
      beforeClose(action, { close: done }, done);
    } else {
      done();
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'error':
        return '错误提示';
      case 'warning':
        return '警告';
      case 'success':
        return '成功';
      default:
        return '提示';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            handleAction('close');
          }
        }}
        TransitionProps={{
          onExited: onExited,
        }}
      >
        <DialogTitle
          sx={{
            color: type === 'error' ? 'error.main' : 'inherit',
            pb: 2,
            pt: 2,
            pl: 10,
            pr: 10,
          }}
        >
          {getTitle()}
          {showClose ? (
            <IconButton
              aria-label="close"
              onClick={() => handleAction('close')}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          ) : null}
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleAction('confirm')} autoFocus>
            确定
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};
