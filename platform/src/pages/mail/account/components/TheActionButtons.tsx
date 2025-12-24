import { useState, useCallback, memo } from 'react';
import {
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import * as mailAccountAPI from '@/api/mail/account';
import type { ListMailAccount } from '../type';
import type { TheFormRef } from './TheForm';

// ==================== 新增账户按钮 ====================

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

/**
 * 新增账户按钮组件
 * 用于页面顶部的新增操作
 */
export const AddTheButton = memo(({ formRef }: AddButtonProps) => {
  const handleAdd = useCallback(() => {
    formRef.current?.onOpen();
  }, [formRef]);

  return (
    <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      新增
    </ResponsiveButton>
  );
});

// ==================== 编辑删除操作按钮 ====================

export interface RowButtonProps {
  account: ListMailAccount;
  formRef: React.RefObject<TheFormRef | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 账户操作按钮组件（编辑 + 删除）
 * 用于表格/卡片中的行操作
 */
export const AccountActionButtons = memo(
  ({ account, formRef, onDeleteSuccess }: RowButtonProps) => {
    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState(false);

    // 处理编辑
    const handleEdit = useCallback(() => {
      formRef.current?.onOpen(account);
    }, [formRef, account]);

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
      if (account.id) {
        await mailAccountAPI.deleteFn({ data: { id: account.id } });
        onDeleteSuccess?.();
      }
      closeDeleteDialog();
    }, [account.id, onDeleteSuccess, closeDeleteDialog]);

    return (
      <>
        <Stack direction="row" spacing={1} justifyContent="center">
          <IconButton onClick={handleEdit} color="primary" size="small">
            <EditIcon />
          </IconButton>
          <IconButton onClick={openDeleteDialog} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </Stack>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除邮件账户 "{account.nickname}" 吗？此操作不可撤销。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog}>取消</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
);