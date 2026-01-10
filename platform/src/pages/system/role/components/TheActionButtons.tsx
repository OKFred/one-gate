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
import * as RoleAPI from '@/api/system/role';
import type { RoleFormRef } from './RoleForm';
import type { TableState } from './RoleTable';

// ==================== 新增角色按钮 ====================

export interface AddButtonProps {
  formRef: React.RefObject<RoleFormRef | null>;
}

/**
 * 新增角色按钮组件
 * 用于页面顶部的新增操作
 */
export const TheActionButtons = memo(({ formRef }: AddButtonProps) => {
  const handleAdd = useCallback(() => {
    formRef.current?.onOpen();
  }, [formRef]);

  return (
    <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      添加角色
    </ResponsiveButton>
  );
});

// ==================== 编辑删除操作按钮 ====================

export interface RowButtonProps {
  row: TableState['list'][0];
  formRef: React.RefObject<RoleFormRef | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 角色操作按钮组件（编辑 + 删除）
 * 用于表格/卡片中的行操作
 */
export const RoleActionButtons = memo(({ row, formRef, onDeleteSuccess }: RowButtonProps) => {
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
      await RoleAPI.deleteFn({ data: { id: row.id } });
      onDeleteSuccess?.();
    }
    closeDeleteDialog();
  }, [row.id, onDeleteSuccess, closeDeleteDialog]);

  return (
    <>
      <Stack direction="row" spacing={1} justifyContent="center">
        <IconButton onClick={handleEdit} color="primary" size="small">
          <EditIcon />
        </IconButton>
        <IconButton onClick={openDeleteDialog} color="error" size="small" disabled={row.id === 1}>
          <DeleteIcon />
        </IconButton>
      </Stack>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除角色 <strong>{row.name}</strong> 吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>取消</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});
