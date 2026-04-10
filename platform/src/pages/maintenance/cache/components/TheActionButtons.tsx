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
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import * as CacheAPI from '@/api/maintenance/cache';
import type { TheDetailRef } from './TheDetail';
import type { ListKeysRes } from '@/api/maintenance/type';
import { useTranslation } from '@/hooks/useTranslation';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import { MAINTENANCE } from '@/hooks/usePermission';
import type { CacheTableRef } from './TheTable';

// 页面顶部操作按钮
interface TheActionButtonsProps {
  tableRef: React.RefObject<CacheTableRef | null>;
}

export function TheActionButtons({ tableRef }: TheActionButtonsProps) {
  const t = useTranslation();

  const handleRefresh = () => {
    tableRef.current?.refresh();
  };

  return (
    <ResponsiveButton variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
      {t('table.refresh')}
    </ResponsiveButton>
  );
}

// 表格行内操作按钮
interface CacheActionButtonsProps {
  cacheKey: ListKeysRes['keys'][0];
  detailRef: React.RefObject<TheDetailRef | null>;
  onDeleteSuccess: () => void;
}

export function CacheActionButtons({
  cacheKey,
  detailRef,
  onDeleteSuccess,
}: CacheActionButtonsProps) {
  const t = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleView = () => {
    detailRef.current?.open(cacheKey.name);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await CacheAPI.deleteFn({ data: { key: cacheKey.name } });
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
          permissionCodes={[MAINTENANCE.CACHE.VIEW]}
        >
          <ViewIcon fontSize="small" />
        </ResponsiveIconButton>

        <ResponsiveIconButton
          size="small"
          color="error"
          onClick={handleDeleteClick}
          title={t('common.delete')}
          permissionCodes={[MAINTENANCE.CACHE.DELETE]}
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
