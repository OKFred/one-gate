import { useState } from 'react';
import {
  Button,
  Stack,
  IconButton,
  Tooltip,
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
import { useResponsive } from '@/hooks/useResponsive';

// 页面顶部操作按钮
interface TheActionButtonsProps {
  formRef: React.RefObject<CacheFormRef | null>;
}

export function TheActionButtons({ formRef }: TheActionButtonsProps) {
  const t = useTranslation();
  const { isMobile } = useResponsive();

  const handleAdd = () => {
    formRef.current?.onOpen('', '');
  };

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="contained"
        startIcon={!isMobile && <AddIcon />}
        onClick={handleAdd}
        size={isMobile ? 'small' : 'medium'}
      >
        {t('cache.actions.add')}
      </Button>
    </Stack>
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
        <Tooltip title={t('common.view')}>
          <IconButton size="small" color="info" onClick={handleView}>
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common.edit')}>
          <IconButton size="small" color="primary" onClick={handleEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('common.delete')}>
          <IconButton size="small" color="error" onClick={handleDeleteClick}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
