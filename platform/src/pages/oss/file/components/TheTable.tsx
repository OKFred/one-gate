import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import {
  IconButton,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Download, Delete, ContentCopy } from '@mui/icons-material';
import { showSnackbar } from '@/components/Notification';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as OSSFileAPI from '@/api/oss/file';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheFilter';
import dayjs from 'dayjs';
import type { ListFileRes } from '@/api/oss/type';

export interface TheTableRef {
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  prefix: '',
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef } = localObj;
    const t = useTranslation();
    const [state, setState] = useState({
      list: [] as NonNullable<ListFileRes['list']>,
      loading: false,
      filters: DEFAULT_FILTERS,
      page: 1,
      pageSize: 10,
      hasMore: false,
      cursors: [undefined] as (string | undefined)[],
    });

    const fetchList = useCallback(
      async (
        filters: FilterState,
        page: number = 1,
        pageSize: number = 10,
        cursors: (string | undefined)[] = [undefined],
      ) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const cursor = cursors[page - 1];
          const res = await OSSFileAPI.listFn({
            data: {
              keyword: filters.prefix,
              pageSize,
              cursor,
            },
          });
          const list = res.data?.data?.list || [];
          const nextCursor = res.data?.data?.cursor;
          const hasMore = !!res.data?.data?.hasMore;

          const nextCursors = [...cursors];
          if (hasMore) {
            nextCursors[page] = nextCursor;
          }

          setState((prev) => ({
            ...prev,
            list,
            filters,
            page,
            pageSize,
            hasMore,
            cursors: nextCursors,
            loading: false,
          }));
          filterRef.current?.updateCount(list.length);
        } catch (e) {
          console.log(e);
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [filterRef],
    );

    useEffect(() => {
      fetchList(DEFAULT_FILTERS);
    }, [fetchList]);

    useImperativeHandle(ref, () => ({
      refresh: (newFilters?: FilterState) => {
        fetchList(newFilters || state.filters, 1, state.pageSize, [undefined]);
      },
    }));

    const formatSize = (bytes: number) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderActions = (row: NonNullable<ListFileRes['list']>[number]) => (
      <FileActionButtons
        row={row}
        onDeleteSuccess={() => fetchList(state.filters, 1, state.pageSize, [undefined])}
      />
    );

    const columns: TableColumn<NonNullable<ListFileRes['list']>[number]>[] = [
      { title: t('oss.file.key'), render: (row) => row.key },
      { title: t('oss.file.size'), render: (row) => formatSize(row.size!) },
      {
        title: t('oss.file.lastModified'),
        render: (row) => dayjs(row.lastModified).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: renderActions,
      },
    ];

    const cardFields: CardField<NonNullable<ListFileRes['list']>[number]>[] = [
      { type: 'title', render: (row) => row.key },
      { type: 'subtitle', render: (row) => formatSize(row.size!) },
      {
        type: 'content',
        label: t('oss.file.lastModified'),
        render: (row) => dayjs(row.lastModified).format('YYYY-MM-DD HH:mm:ss'),
      },
    ];

    return (
      <ResponsiveList
        data={state.list!}
        loading={state.loading}
        keyExtractor={(row) => row.key!}
        columns={columns}
        cardFields={cardFields}
        cardActions={renderActions}
        page={state.page}
        total={state.hasMore ? state.page * state.pageSize + 1 : state.page * state.pageSize}
        pageSize={state.pageSize}
        onPageChange={(page) => fetchList(state.filters, page, state.pageSize, state.cursors)}
        onPageSizeChange={(pageSize) => fetchList(state.filters, 1, pageSize, [undefined])}
      />
    );
  }),
);

interface FileActionButtonsProps {
  row: NonNullable<ListFileRes['list']>[number];
  onDeleteSuccess: () => void;
}

const FileActionButtons = memo(({ row, onDeleteSuccess }: FileActionButtonsProps) => {
  const t = useTranslation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleGetDownloadUrl = async (key: string, copyToClipboard: boolean = false) => {
    try {
      const res = await OSSFileAPI.getFn({ data: { key } });
      const url = res.data?.data?.downloadUrl;
      if (!url) return;

      if (copyToClipboard) {
        await navigator.clipboard.writeText(url);
        showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    try {
      await OSSFileAPI.deleteFn({ data: { key: row.key } });
      onDeleteSuccess();
      showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
    } catch (e) {
      console.log(e);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <Box>
        <Tooltip title={t('oss.file.download')}>
          <IconButton size="small" color="primary" onClick={() => handleGetDownloadUrl(row.key!)}>
            <Download />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('oss.file.copyUrl')}>
          <IconButton
            size="small"
            color="info"
            onClick={() => handleGetDownloadUrl(row.key!, true)}
          >
            <ContentCopy />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.delete')}>
          <IconButton size="small" color="error" onClick={() => handleDelete()}>
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('oss.file.deleteConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined">
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

export default TheTable;
