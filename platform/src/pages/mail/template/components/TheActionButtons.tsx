import { memo, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { MAIL } from '@/hooks/usePermission';
import * as MailTemplateAPI from '@/api/mail/template';
import { showSnackbar } from '@/components/Notification';
import type { TheFormRef } from './TheForm';
import type { ListMailTemplateRes } from '@/api/mail/type';
import type { TableState } from './TheTable';

interface TheActionButtonsProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = memo(({ formRef }: TheActionButtonsProps) => {
  const t = useTranslation();

  const handleAdd = () => {
    formRef.current?.onOpen();
  };

  return (
    <ResponsiveButton
      variant="contained"
      startIcon={<AddIcon />}
      onClick={handleAdd}
      permissionCodes={[MAIL.TEMPLATE.ADD]}
    >
      {t('dialog.add')}
    </ResponsiveButton>
  );
});

TheActionButtons.displayName = 'TheActionButtons';

// ==================== 模板操作按钮 ====================

export interface TemplateActionButtonsProps {
  template: NonNullable<ListMailTemplateRes['list']>[0];
  formRef: React.RefObject<TheFormRef | null>;
  previewRef: React.RefObject<{ onOpen: (template: TableState['list'][0]) => void } | null>;
  /** 删除成功后的回调 */
  onDeleteSuccess?: () => void;
}

/**
 * 模板操作按钮组件（预览 + 编辑 + 删除）
 * 用于表格/卡片中的行操作
 */
export const TemplateActionButtons = memo(
  ({ template, formRef, previewRef, onDeleteSuccess }: TemplateActionButtonsProps) => {
    const t = useTranslation();
    const [deleteDialog, setDeleteDialog] = useState(false);

    // 处理预览
    const handlePreview = useCallback(() => {
      previewRef.current?.onOpen(template);
    }, [previewRef, template]);

    // 处理编辑
    const handleEdit = useCallback(() => {
      formRef.current?.onOpen(template);
    }, [formRef, template]);

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
      if (!template.id) return;

      try {
        await MailTemplateAPI.deleteFn({ data: { id: template.id } });
        showSnackbar({
          message: t('dialog.operationSuccess'),
          type: 'success',
        });
        onDeleteSuccess?.();
      } catch (error) {
        console.warn(error);
      } finally {
        closeDeleteDialog();
      }
    }, [template.id, onDeleteSuccess, closeDeleteDialog, t]);

    return (
      <>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <ResponsiveIconButton
            onClick={handlePreview}
            color="info"
            size="small"
            permissionCodes={[MAIL.TEMPLATE.ADD]}
          >
            <ViewIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={handleEdit}
            color="primary"
            size="small"
            permissionCodes={[MAIL.TEMPLATE.EDIT]}
          >
            <EditIcon />
          </ResponsiveIconButton>
          <ResponsiveIconButton
            onClick={openDeleteDialog}
            color="error"
            size="small"
            permissionCodes={[MAIL.TEMPLATE.DELETE]}
          >
            <DeleteIcon />
          </ResponsiveIconButton>
        </Stack>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog} onClose={closeDeleteDialog}>
          <DialogTitle>{t('dialog.confirm')}</DialogTitle>
          <DialogContent>{t('dialog.deleteConfirmTitle')}</DialogContent>
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

TemplateActionButtons.displayName = 'TemplateActionButtons';
