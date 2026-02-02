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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import * as AccountAPI from '@/api/mail/account';
import type { TheFormRef } from './TheForm';
import type { TableState } from './TheTable';
import { useTranslation } from '@/hooks/useTranslation';
import { MAIL } from '@/hooks/usePermission';

// ==================== 新增账户按钮 ====================

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

/**
 * 新增账户按钮组件
 * 用于页面顶部的新增操作
 */
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
      permissionCodes={[MAIL.ACCOUNT.ADD]}
    >
      {t('dialog.add')}
    </ResponsiveButton>
  );
});

// ==================== 编辑删除操作按钮 ====================

export interface RowButtonProps {
  row: TableState['list'][0];
  formRef: React.RefObject<TheFormRef | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 账户操作按钮组件（编辑 + 删除）
 * 用于表格/卡片中的行操作
 */
export const AccountActionButtons = memo(({ row, formRef, onDeleteSuccess }: RowButtonProps) => {
  const t = useTranslation();
  // 删除确认对话框状态
  const [deleteDialog, setDeleteDialog] = useState(false);

  // 处理编辑
  const handleEdit = useCallback(() => {
    formRef.current?.onOpen(row);
  }, [formRef, row]);

  // 打开删除确认对话框
  const openDeleteDialog = useCallback(() => {
    setDeleteDialog(true);
  }, []);

  // 关闭删除确认对话框
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(false);
  }, []);

  // 确认删除
  const handleConfirmDelete = useCallback(async () => {
    if (row.id) {
      await AccountAPI.deleteFn({ data: { id: row.id } });
      onDeleteSuccess?.();
    }
    closeDeleteDialog();
  }, [row.id, onDeleteSuccess, closeDeleteDialog]);

  return (
    <>
      <Stack direction="row" spacing={1} justifyContent="center">
        <ResponsiveIconButton
          onClick={handleEdit}
          color="primary"
          size="small"
          permissionCodes={[MAIL.ACCOUNT.EDIT]}
        >
          <EditIcon />
        </ResponsiveIconButton>
        <ResponsiveIconButton
          onClick={openDeleteDialog}
          color="error"
          size="small"
          permissionCodes={[MAIL.ACCOUNT.DELETE]}
        >
          <DeleteIcon />
        </ResponsiveIconButton>
      </Stack>

      {/* 删除确认对话框 */}
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
});
