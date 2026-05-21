import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import {
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import { ResponsiveIconButton } from '@/components/Responsive/index';
import * as SchemaFormAPI from '@/api/system/schemaForm';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import type { ListSchemaFormReq, ListSchemaFormRes } from '@/api/system/type';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

export type SchemaFormItem = NonNullable<ListSchemaFormRes['list']>[0];

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

// 表格内部状态
export interface TableState {
  list: SchemaFormItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
  isEnabled: undefined,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef, previewRef } = localObj;
    const t = useTranslation();

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      list: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { list, loading, page, pageSize, total, filters } = state;

    // 获取数据的核心函数
    const fetchForms = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData: ListSchemaFormReq = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          if (searchFilters.keyword) {
            requestData.keyword = searchFilters.keyword;
          }
          if (searchFilters.isEnabled !== undefined) {
            requestData.isEnabled = searchFilters.isEnabled;
          }

          const res = await SchemaFormAPI.listFn({ data: requestData });
          const response = res.data;
          const formsList = (response?.data?.list || []) as SchemaFormItem[];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: formsList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
          setState((prev) => ({ ...prev, list: [], total: 0 }));
          filterRef.current?.updateCount(0);
        }
      },
      [state.pageSize, filterRef],
    );

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(() => {
      fetchForms(filters, 1);
    }, [fetchForms, filters]);

    // 初始加载
    useEffect(() => {
      fetchForms(DEFAULT_FILTERS, 1);
    }, [fetchForms]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchForms(filtersToUse, pageToUse);
        },
      }),
      [fetchForms, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchForms(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      fetchForms(filters, 1);
    };

    // 行内操作按钮子组件
    const RowActionButtons = ({ row }: { row: SchemaFormItem }) => {
      const [deleteDialog, setDeleteDialog] = useState(false);

      const handleEdit = () => {
        formRef.current?.openEdit(row);
      };

      const handlePreview = () => {
        previewRef.current?.open(row.code || '', row.schemaData || '{}');
      };

      const handleConfirmDelete = async () => {
        if (row.id) {
          await SchemaFormAPI.deleteFn({ data: { id: row.id } });
          handleDeleteSuccess();
        }
        setDeleteDialog(false);
      };

      return (
        <>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
            <ResponsiveIconButton
              onClick={handlePreview}
              color="info"
              size="small"
              title={t('schemaForm.actions.preview')}
            >
              <PlayIcon />
            </ResponsiveIconButton>
            <ResponsiveIconButton
              onClick={handleEdit}
              color="primary"
              size="small"
              title={t('dialog.edit')}
            >
              <EditIcon />
            </ResponsiveIconButton>
            <ResponsiveIconButton
              onClick={() => setDeleteDialog(true)}
              color="error"
              size="small"
              title={t('dialog.delete')}
            >
              <DeleteIcon />
            </ResponsiveIconButton>
          </Stack>

          <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
            <DialogTitle>{t('dialog.deleteConfirmTitle')}</DialogTitle>
            <DialogContent>
              <DialogContentText>{t('schemaForm.deleteConfirmText')}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialog(false)} variant="outlined">
                {t('dialog.cancel')}
              </Button>
              <Button onClick={handleConfirmDelete} color="error" autoFocus>
                {t('dialog.confirm')}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      );
    };

    // 表格列配置（PC端）
    const columns: TableColumn<SchemaFormItem>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      {
        title: t('schemaForm.code'),
        render: (row) => <Chip label={row.code} size="small" color="primary" variant="outlined" />,
      },
      { title: t('schemaForm.name'), render: (row) => row.name },
      {
        title: t('status.enabled'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            size="small"
            color={row.isEnabled ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      { title: t('schemaForm.creatorName'), render: (row) => row.creatorName || '-' },
      { title: t('schemaForm.updaterName'), render: (row) => row.updaterName || '-' },
      {
        title: t('columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => <RowActionButtons row={row} />,
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<SchemaFormItem>[] = [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', label: t('schemaForm.code'), render: (row) => row.code },
      {
        type: 'tags',
        render: (row) => (
          <>
            <Chip
              label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
              size="small"
              color={row.isEnabled ? 'success' : 'default'}
              variant="outlined"
            />
            <Chip label={`ID: ${row.id}`} size="small" variant="outlined" />
          </>
        ),
      },
    ];

    return (
      <ResponsiveList
        data={list}
        loading={loading}
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        keyExtractor={(row) => row.id!}
        columns={columns}
        cardFields={cardFields}
        cardActions={(row) => <RowActionButtons row={row} />}
      />
    );
  }),
);

export default TheTable;
