import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { useRef } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: React.ReactNode;
  content?: React.ReactNode;
  loading?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  content,
  loading = false,
}: DeleteConfirmDialogProps) {
  const t = useTranslation();
  const displayed = useRef({
    title: title || t('dialog.deleteConfirmTitle'),
    content: content || t('table.deleteConfirm'),
  });
  // The parent clears its row on close while MUI still renders the exit transition.
  if (open) {
    displayed.current = {
      title: title || t('dialog.deleteConfirmTitle'),
      content: content || t('table.deleteConfirm'),
    };
  }
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose}>
      <DialogTitle>{displayed.current.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{displayed.current.content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" disabled={loading}>
          {t('dialog.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" autoFocus disabled={loading}>
          {t('dialog.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
