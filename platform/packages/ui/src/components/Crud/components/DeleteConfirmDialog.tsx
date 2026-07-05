import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, t }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('table.deleteConfirm')}</DialogContentText>
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
