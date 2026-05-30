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
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import * as SchemaFormAPI from '@/api/system/schemaForm';
import type { TheFormRef } from './TheForm';
import type { ThePreviewDialogRef } from './ThePreviewDialog';
import type { SchemaFormItem } from './TheTable';
import { useTranslation } from '@/hooks/useTranslation';

// ==================== 新增表单按钮 ====================

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = memo(({ formRef }: AddButtonProps) => {
  const t = useTranslation();
  const handleAdd = useCallback(() => {
    formRef.current?.openAdd();
  }, [formRef]);

  return (
    <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      {t('schemaForm.actions.add')}
    </ResponsiveButton>
  );
});

// ==================== 行内操作操作按钮 ====================

export interface RowActionButtonsProps {
  row: SchemaFormItem;
  formRef: React.RefObject<TheFormRef | null>;
  previewRef: React.RefObject<ThePreviewDialogRef | null>;
  onDeleteSuccess: () => void;
}

export const RowActionButtons = memo(
  ({ row, formRef, previewRef, onDeleteSuccess }: RowActionButtonsProps) => {
    const [deleteDialog, setDeleteDialog] = useState(false);
    const t = useTranslation();

    const handleEdit = useCallback(() => {
      formRef.current?.openEdit(row);
    }, [formRef, row]);

    const handlePreview = useCallback(() => {
      previewRef.current?.open(row.code || '', row.schemaData || '{}');
    }, [previewRef, row.code, row.schemaData]);

    const openDeleteDialog = useCallback(() => {
      setDeleteDialog(true);
    }, []);

    const closeDeleteDialog = useCallback(() => {
      setDeleteDialog(false);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
      if (row.id) {
        await SchemaFormAPI.deleteFn({ data: { id: row.id } });
        onDeleteSuccess();
      }
      closeDeleteDialog();
    }, [row.id, onDeleteSuccess, closeDeleteDialog]);

    return (
      <>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <ResponsiveIconButton
            onClick={handlePreview}
            color="info"
            size="small"
            title={t('schemaForm.actions.preview')}
          >
            <PlayIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={handleEdit}
            color="primary"
            size="small"
            title={t('dialog.edit')}
          >
            <EditIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={openDeleteDialog}
            color="error"
            size="small"
            title={t('dialog.delete')}
          >
            <DeleteIcon />
          </ResponsiveIconButton>
        </Stack>

        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('schemaForm.deleteConfirmText')}</DialogContentText>
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
