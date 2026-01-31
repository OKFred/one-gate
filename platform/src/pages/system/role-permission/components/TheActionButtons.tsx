import { memo, useState, useCallback } from 'react';
import {
  Button,
  Box,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteSweep as DeleteSweepIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useResponsive } from '@/hooks/useResponsive';
import type { Props } from '../index';
import * as RolePermissionAPI from '@/api/system/role_permission';
import type { ListRolePermissionRes } from '@/api/system/type';
import { useTranslation } from '@/hooks/useTranslation';

interface TheActionButtonsProps extends Props {
  /** 选中的行数据 */
  selectedRows: NonNullable<ListRolePermissionRes['list']>;
  /** 批量删除回调 */
  onBatchDelete: () => void;
}

const TheActionButtons = memo(function TheActionButtons({
  localObj,
  selectedRows,
  onBatchDelete,
}: TheActionButtonsProps) {
  const t = useTranslation();
  const { formRef } = localObj;
  const { isMobile } = useResponsive();

  const handleBatchAdd = () => {
    formRef.current?.onBatchAdd();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: isMobile ? 1 : 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        mb: 2,
      }}
    >
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleBatchAdd}
        size={isMobile ? 'large' : 'medium'}
        sx={{
          minWidth: isMobile ? 'auto' : 120,
          flex: isMobile ? 1 : 'none',
        }}
      >
        {t('rolePermission.batchAdd')}
      </Button>

      {selectedRows.length > 0 && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          onClick={onBatchDelete}
          size={isMobile ? 'large' : 'medium'}
          sx={{
            minWidth: isMobile ? 'auto' : 120,
            flex: isMobile ? 1 : 'none',
          }}
        >
          {t('rolePermission.batchDelete')} ({selectedRows.length})
        </Button>
      )}
    </Box>
  );
});

// ==================== 行操作按钮 ====================

export interface RolePermissionActionButtonsProps {
  row: NonNullable<ListRolePermissionRes['list']>[0];
  formRef: React.RefObject<{
    onOpen: (row?: NonNullable<ListRolePermissionRes['list']>[0]) => void;
  } | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 角色权限操作按钮组件（编辑 + 删除）
 * 用于表格/卡片中的行操作
 */
export const RolePermissionActionButtons = memo(
  ({ row, formRef, onDeleteSuccess }: RolePermissionActionButtonsProps) => {
    const t = useTranslation();
    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState(false);

    const handleEdit = () => {
      formRef.current?.onOpen(row);
    };

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
        try {
          await RolePermissionAPI.batchDeleteFn({
            data: { roleId: row.roleId, permissionIds: [row.permissionId] },
          });
          onDeleteSuccess?.();
        } catch (error) {
          console.warn('Failed to delete role permission:', error);
        }
      }
      closeDeleteDialog();
    }, [row.id, row.roleId, row.permissionId, onDeleteSuccess, closeDeleteDialog]);

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
          <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>{t('table.deleteConfirm')}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} variant="outlined">
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              {t('dialog.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
);

export default TheActionButtons;
