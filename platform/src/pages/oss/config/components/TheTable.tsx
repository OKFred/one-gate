import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Edit, Delete, PlayCircleOutlined as PlayIcon } from '@mui/icons-material';
import { showSnackbar } from '@/components/Notification';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as OSSConfigAPI from '@/api/oss/config';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheFilter';
import type { ListConfigRes } from '@/api/oss/type';
import type { TheFormRef } from './TheForm';

export interface TheTableRef {
  refresh: (filters?: FilterState) => void;
}

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
    const t = useTranslation();
    const [state, setState] = useState({
      list: [] as ListConfigRes['list'],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: { keyword: '', orderBy: 'id', descend: true } as FilterState,
    });

    const fetchList = useCallback(
      async (filters: FilterState, page: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const res = await OSSConfigAPI.listFn({
            data: {
              pageNo: page,
              pageSize: state.pageSize,
              keyword: filters.keyword,
              isEnabled: filters.isEnabled,
              orderBy: filters.orderBy,
              descend: filters.descend,
            },
          });
          const data = res.data?.data;
          setState((prev) => ({
            ...prev,
            list: data?.list || [],
            total: data?.total || 0,
            page,
            filters,
            loading: false,
          }));
          filterRef.current?.updateCount(data?.total || 0);
        } catch (e) {
          console.log(e);
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [state.pageSize, filterRef],
    );

    useEffect(() => {
      fetchList(state.filters, 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchList]);

    useImperativeHandle(ref, () => ({
      refresh: (newFilters?: FilterState) => {
        fetchList(newFilters || state.filters, newFilters ? 1 : state.page);
      },
    }));

    const renderActions = (row: ListConfigRes['list'][number]) => (
      <ConfigActionButtons
        row={row}
        formRef={formRef}
        onRefresh={() => fetchList(state.filters, 1)}
      />
    );

    const columns: TableColumn<ListConfigRes['list'][number]>[] = [
      { title: t('oss.config.name'), render: (row) => row.name },
      {
        title: t('oss.config.provider'),
        render: (row) => <Chip label={row.provider} size="small" />,
      },
      { title: t('oss.config.bucket'), render: (row) => row.bucket },
      {
        title: t('oss.config.isDefault'),
        render: (row) => (
          <Chip
            label={row.isDefault ? t('column.yes') : t('column.no')}
            color={row.isDefault ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        title: t('columns.status'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'primary' : 'error'}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: renderActions,
      },
    ];

    const cardFields: CardField<ListConfigRes['list'][number]>[] = [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', render: (row) => row.provider },
      { type: 'content', label: t('oss.config.bucket'), render: (row) => row.bucket },
      {
        type: 'tags',
        render: (row) => (
          <>
            {row.isDefault && (
              <Chip label={t('oss.config.isDefault')} color="success" size="small" />
            )}
            <Chip
              label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
              color={row.isEnabled ? 'primary' : 'error'}
              size="small"
              variant="outlined"
            />
          </>
        ),
      },
    ];

    return (
      <ResponsiveList
        data={state.list}
        loading={state.loading}
        page={state.page}
        total={state.total}
        pageSize={state.pageSize}
        keyExtractor={(row) => row.id}
        columns={columns}
        cardFields={cardFields}
        cardActions={renderActions}
        onPageChange={(p) => fetchList(state.filters, p)}
      />
    );
  }),
);

interface ConfigActionButtonsProps {
  row: ListConfigRes['list'][number];
  formRef: React.RefObject<TheFormRef | null>;
  onRefresh: () => void;
}

const ConfigActionButtons = memo(({ row, formRef, onRefresh }: ConfigActionButtonsProps) => {
  const t = useTranslation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleVerify = async (id: number) => {
    try {
      await OSSConfigAPI.verifyFn({ data: { id } });
      showSnackbar({ message: t('status.success'), type: 'success' });
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    try {
      await OSSConfigAPI.deleteFn({ data: { id: row.id } });
      onRefresh();
      showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <Box>
        <Tooltip title={t('oss.config.verify')}>
          <IconButton size="small" color="info" onClick={() => handleVerify(row.id)}>
            <PlayIcon />
          </IconButton>
        </Tooltip>
        <IconButton size="small" color="primary" onClick={() => formRef.current?.open(row.id)}>
          <Edit />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => handleDelete()}>
          <Delete />
        </IconButton>
      </Box>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('table.deleteConfirm')}</DialogContentText>
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
