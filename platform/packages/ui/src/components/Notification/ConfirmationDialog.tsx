import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { useTranslation } from '@/hooks/useTranslation';

const theme = createTheme();

export interface ConfirmationOptions {
  message: string;
  title?: string;
  type?: 'warning' | 'error' | 'info';
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmationDialogProps extends ConfirmationOptions {
  onResult: (confirmed: boolean) => void;
  onExited: () => void;
}

/** 可访问、可主题化的异步确认对话框，替代浏览器原生 confirm。 */
export function ConfirmationDialog({
  message,
  title,
  type = 'warning',
  confirmText,
  cancelText,
  destructive = false,
  onResult,
  onExited,
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(true);
  const t = useTranslation();

  const finish = (confirmed: boolean) => {
    setOpen(false);
    onResult(confirmed);
  };

  const resolvedTitle =
    title ??
    (type === 'error'
      ? t('dialog.titie.error')
      : type === 'info'
        ? t('dialog.titie.info')
        : t('dialog.titie.warning'));

  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open}
        onClose={() => finish(false)}
        aria-labelledby="global-confirmation-title"
        aria-describedby="global-confirmation-description"
        slotProps={{ transition: { onExited } }}
      >
        <DialogTitle id="global-confirmation-title" sx={{ pr: 6 }}>
          {resolvedTitle}
          <IconButton
            aria-label={t('dialog.cancel')}
            onClick={() => finish(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="global-confirmation-description">{message}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => finish(false)} variant="outlined">
            {cancelText ?? t('dialog.cancel')}
          </Button>
          <Button
            onClick={() => finish(true)}
            color={destructive ? 'error' : type === 'warning' ? 'warning' : 'primary'}
            variant="contained"
            autoFocus
          >
            {confirmText ?? t('dialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
