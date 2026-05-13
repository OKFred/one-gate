import { useState, useCallback, memo } from 'react';
import {
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import * as AttendanceAPI from '@/api/enterprise/attendance';
import type { TheFormRef } from './TheForm';
import type { TheDetailRef } from './TheDetail';
import { useTranslation } from '@/hooks/useTranslation';
import { ENTERPRISE } from '@/hooks/usePermission';
import type { AttendanceObj } from '@/api/enterprise/type';

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = memo(({ formRef }: AddButtonProps) => {
  const t = useTranslation();
  const handleAdd = useCallback(() => {
    formRef.current?.onOpen();
  }, [formRef]);

  return (
    <ResponsiveButton
      variant="contained"
      startIcon={<AddIcon />}
      onClick={handleAdd}
      permissionCodes={[ENTERPRISE.ATTENDANCE.ADD]}
    >
      {t('dialog.add')}
    </ResponsiveButton>
  );
});

export interface RowButtonProps {
  row: AttendanceObj;
  formRef: React.RefObject<TheFormRef | null>;
  detailRef: React.RefObject<TheDetailRef | null>;
  onDeleteSuccess?: () => void;
}

export const AttendanceActionButtons = memo(
  ({ row, formRef, detailRef, onDeleteSuccess }: RowButtonProps) => {
    const t = useTranslation();
    const [deleteDialog, setDeleteDialog] = useState(false);

    const handleEdit = useCallback(() => {
      formRef.current?.onOpen(row);
    }, [formRef, row]);

    const handleView = useCallback(() => {
      detailRef.current?.onOpen(row);
    }, [detailRef, row]);

    const openDeleteDialog = useCallback(() => {
      setDeleteDialog(true);
    }, []);

    const closeDeleteDialog = useCallback(() => {
      setDeleteDialog(false);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
      if (row.id) {
        await AttendanceAPI.deleteFn({ data: { id: row.id } });
        onDeleteSuccess?.();
      }
      closeDeleteDialog();
    }, [row.id, onDeleteSuccess, closeDeleteDialog]);

    return (
      <>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <ResponsiveIconButton onClick={handleView} color="info" size="small">
            <ViewIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={handleEdit}
            color="primary"
            size="small"
            permissionCodes={[ENTERPRISE.ATTENDANCE.EDIT]}
          >
            <EditIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={openDeleteDialog}
            color="error"
            size="small"
            permissionCodes={[ENTERPRISE.ATTENDANCE.DELETE]}
          >
            <DeleteIcon />
          </ResponsiveIconButton>
        </Stack>

        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('table.deleteConfirm')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} variant="outlined">
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              {t('dialog.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
);
