import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

import { useTranslation } from '@/hooks/useTranslation';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: React.ReactNode;
  content?: React.ReactNode;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  content,
}: DeleteConfirmDialogProps) {
  const t = useTranslation();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title || t('dialog.deleteConfirmTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content || t('table.deleteConfirm')}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t('dialog.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" autoFocus>
          {t('dialog.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
