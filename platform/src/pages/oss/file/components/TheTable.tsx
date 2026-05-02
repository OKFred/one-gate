import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { IconButton, Box, Tooltip } from '@mui/material';
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

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef } = localObj;
    const t = useTranslation();
    const [state, setState] = useState({
      list: [] as ListFileRes['list'],
      loading: false,
      filters: { prefix: '' } as FilterState,
    });

    const fetchList = useCallback(
      async (filters: FilterState) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const res = await OSSFileAPI.listFn({
            data: {
              prefix: filters.prefix,
            },
          });
          const list = res.data?.data?.list || [];
          setState((prev) => ({
            ...prev,
            list,
            filters,
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
      fetchList(state.filters);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchList]);

    useImperativeHandle(ref, () => ({
      refresh: (newFilters?: FilterState) => {
        fetchList(newFilters || state.filters);
      },
    }));

    const handleGetDownloadUrl = async (key: string, copyToClipboard: boolean = false) => {
      try {
        const res = await OSSFileAPI.getDownloadUrlFn({ data: { key, expiresIn: 60 * 60 } });
        const url = res.data?.data?.url;
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

    const handleDelete = async (key: string) => {
      if (!confirm(t('oss.file.deleteConfirm'))) return;
      try {
        await OSSFileAPI.deleteFn({ data: { key } });
        fetchList(state.filters);
        showSnackbar({ message: t('dialog.operationSuccess'), type: 'success' });
      } catch (e) {
        console.log(e);
      }
    };

    const formatSize = (bytes: number) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderActions = (row: NonNullable<ListFileRes['list']>[number]) => (
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
          <IconButton size="small" color="error" onClick={() => handleDelete(row.key!)}>
            <Delete />
          </IconButton>
        </Tooltip>
      </Box>
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
        page={1}
        total={state.list?.length || 0}
        pageSize={state.list?.length || 10}
        onPageChange={() => {}}
      />
    );
  }),
);

export default TheTable;
