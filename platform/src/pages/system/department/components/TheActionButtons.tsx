import { useState, useCallback, memo } from 'react';
import {
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheFormRef, DepartmentData } from './TheForm';

// ==================== 新增部门按钮 ====================

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

/**
 * 新增部门按钮组件
 * 用于页面顶部的新增操作
 */
export const TheActionButtons = memo(({ formRef }: AddButtonProps) => {
  const t = useTranslation();
  const handleAdd = useCallback(() => {
    formRef.current?.openAdd();
  }, [formRef]);

  return (
    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      {t('common.actions.add')}
    </Button>
  );
});

TheActionButtons.displayName = 'TheActionButtons';

// ==================== 部门树节点操作按钮 ====================

export interface TreeNodeButtonsProps {
  node: DepartmentData;
  formRef: React.RefObject<TheFormRef | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 部门树节点操作按钮组件（添加子部门 + 编辑 + 删除）
 * 用于树节点中的操作
 */
export const TreeNodeActionButtons = memo(
  ({ node, formRef, onDeleteSuccess }: TreeNodeButtonsProps) => {
    const t = useTranslation();
    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState(false);

    // 处理添加子部门
    const handleAddChild = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        formRef.current?.openAdd(node.id);
      },
      [formRef, node.id],
    );

    // 处理编辑
    const handleEdit = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        formRef.current?.openEdit(node);
      },
      [formRef, node],
    );

    // 打开删除确认对话框
    const openDeleteDialog = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteDialog(true);
    }, []);

    // 关闭删除确认对话框
    const closeDeleteDialog = useCallback(() => {
      setDeleteDialog(false);
    }, []);

    // 确认删除
    const handleConfirmDelete = useCallback(async () => {
      closeDeleteDialog();
      onDeleteSuccess?.();
    }, [onDeleteSuccess, closeDeleteDialog]);

    // 是否有子部门
    const hasChildren = !!(node.children && node.children.length > 0);

    return (
      <>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handleAddChild}
            title={t('system.department.actions.addChild')}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleEdit} title={t('common.actions.edit')}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={openDeleteDialog}
            title={t('common.actions.delete')}
            disabled={hasChildren}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>{t('common.actions.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('form.actions.deleteConfirmMessage')}
            </DialogContentText>
            {hasChildren && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                该部门存在子部门，请先删除子部门后再删除该部门。
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={hasChildren}>
              {t('common.actions.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
);

TreeNodeActionButtons.displayName = 'TreeNodeActionButtons';
