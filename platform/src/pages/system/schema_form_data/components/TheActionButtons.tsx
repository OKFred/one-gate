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
import { Visibility as ViewIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ResponsiveIconButton } from '@/components/Responsive/index';
import * as SchemaFormDataAPI from '@/api/system/schemaFormData';
import type { SchemaFormDataItem } from './TheTable';
import type { TheDetailsDialogRef } from './TheDetailsDialog';
import { useTranslation } from '@/hooks/useTranslation';

// ==================== 行内操作操作按钮 ====================

interface RowActionButtonsProps {
  row: SchemaFormDataItem;
  detailsRef: React.RefObject<TheDetailsDialogRef | null>;
  onDeleteSuccess: () => void;
}

export const RowActionButtons = memo(
  ({ row, detailsRef, onDeleteSuccess }: RowActionButtonsProps) => {
    const [deleteDialog, setDeleteDialog] = useState(false);
    const t = useTranslation();

    const handleViewDetails = useCallback(() => {
      detailsRef.current?.open(row.formCode || '', row.dataContent || '{}', row.businessId || 0);
    }, [detailsRef, row.formCode, row.dataContent, row.businessId]);

    const openDeleteDialog = useCallback(() => {
      setDeleteDialog(true);
    }, []);

    const closeDeleteDialog = useCallback(() => {
      setDeleteDialog(false);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
      if (row.id) {
        await SchemaFormDataAPI.deleteFn({ data: { id: row.id } });
        onDeleteSuccess();
      }
      closeDeleteDialog();
    }, [row.id, onDeleteSuccess, closeDeleteDialog]);

    return (
      <>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <ResponsiveIconButton
            onClick={handleViewDetails}
            color="primary"
            size="small"
            title={t('schemaFormData.actions.view')}
          >
            <ViewIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={openDeleteDialog}
            color="error"
            size="small"
            title={t('schemaFormData.actions.delete')}
          >
            <DeleteIcon />
          </ResponsiveIconButton>
        </Stack>

        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('schemaFormData.deleteConfirmText')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} variant="outlined">
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              {t('dialog.confirm')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
);
