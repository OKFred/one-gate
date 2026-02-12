import { useState } from 'react';
import {
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import * as CacheAPI from '@/api/operation_maintenance/cache';
import type { CacheFormRef } from './TheForm';
import type { ListKeysRes } from '@/api/operation_maintenance/type';
import { useTranslation } from '@/hooks/useTranslation';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import { OPERATION_MAINTENANCE } from '@/hooks/usePermission';

// 页面顶部操作按钮
interface TheActionButtonsProps {
  formRef: React.RefObject<CacheFormRef | null>;
}

export function TheActionButtons({ formRef }: TheActionButtonsProps) {
  const t = useTranslation();

  const handleAdd = () => {
    formRef.current?.onOpen('', '');
  };

  return (
    <ResponsiveButton
      variant="contained"
      startIcon={<AddIcon />}
      onClick={handleAdd}
      permissionCodes={[OPERATION_MAINTENANCE.CACHE.ADD]}
    >
      {t('cache.actions.add')}
    </ResponsiveButton>
  );
}

// 表格行内操作按钮
interface CacheActionButtonsProps {
  cacheKey: ListKeysRes['keys'][0];
  namespace: string;
  formRef: React.RefObject<CacheFormRef | null>;
  onDeleteSuccess: () => void;
}

export function CacheActionButtons({
  cacheKey,
  namespace,
  formRef,
  onDeleteSuccess,
}: CacheActionButtonsProps) {
  const t = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleView = () => {
    formRef.current?.onOpen(namespace, cacheKey.name);
  };

  const handleEdit = () => {
    formRef.current?.onOpen(namespace, cacheKey.name);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await CacheAPI.deleteFn({ data: { namespace, key: cacheKey.name } });
      setDeleteDialogOpen(false);
      onDeleteSuccess();
    } catch (error) {
      console.warn(error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={0.5}>
        <ResponsiveIconButton
          size="small"
          color="info"
          onClick={handleView}
          title={t('common.view')}
          permissionCodes={[OPERATION_MAINTENANCE.CACHE.VIEW]}
        >
          <ViewIcon fontSize="small" />
        </ResponsiveIconButton>

        <ResponsiveIconButton
          size="small"
          color="primary"
          onClick={handleEdit}
          title={t('common.edit')}
          permissionCodes={[OPERATION_MAINTENANCE.CACHE.EDIT]}
        >
          <EditIcon fontSize="small" />
        </ResponsiveIconButton>

        <ResponsiveIconButton
          size="small"
          color="error"
          onClick={handleDeleteClick}
          title={t('common.delete')}
          permissionCodes={[OPERATION_MAINTENANCE.CACHE.DELETE]}
        >
          <DeleteIcon fontSize="small" />
        </ResponsiveIconButton>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('cache.deleteConfirm')}: {cacheKey.name}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={deleting} autoFocus>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
