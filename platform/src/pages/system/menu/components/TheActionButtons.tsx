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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { TheFormRef, MenuData } from './TheForm';
import { useTranslation } from '@/hooks/useTranslation';

// ==================== 新增菜单按钮 ====================

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

/**
 * 新增菜单按钮组件
 * 用于页面顶部的新增操作
 */
export const TheActionButtons = memo(({ formRef }: AddButtonProps) => {
  const t = useTranslation();
  const handleAdd = useCallback(() => {
    formRef.current?.openAdd();
  }, [formRef]);

  return (
    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      {t('dialog.add')}
    </Button>
  );
});

// ==================== 菜单树节点操作按钮 ====================

export interface TreeNodeButtonsProps {
  node: MenuData;
  formRef: React.RefObject<TheFormRef | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 菜单树节点操作按钮组件（添加子菜单 + 编辑 + 删除）
 * 用于树节点中的操作
 */
export const TreeNodeActionButtons = memo(
  ({ node, formRef, onDeleteSuccess }: TreeNodeButtonsProps) => {
    const t = useTranslation();
    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState(false);

    // 处理添加子菜单
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

    return (
      <>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handleAddChild}
            title={t('menu.dialog.addSubMenu')}
          >
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleEdit} title={t('dialog.edit')}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={openDeleteDialog} title={t('dialog.delete')}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('table.deleteConfirm')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog}>{t('dialog.cancel')}</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              {t('dialog.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
);

TreeNodeActionButtons.displayName = 'TreeNodeActionButtons';
