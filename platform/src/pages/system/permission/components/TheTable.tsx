import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as PermissionAPI from '@/api/system/permission';
import { PermissionActionButtons } from './TheActionButtons';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListPermissionRes } from '@/api/system/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import type { FilterState } from './TheFilter';

// 表格内部状态
export interface TableState {
  list: NonNullable<ListPermissionRes['list']>;
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  type: undefined,
  isEnabled: undefined,
  orderBy: 'id',
  descend: false,
  effect: undefined,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef, allPermissions } = localObj;
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

    // 根据权限ID获取权限名称
    const getPermissionName = useCallback(
      (permissionId: number | null | undefined): string => {
        if (!permissionId) return '--';
        const permission = allPermissions.find((p) => p.id === permissionId);
        return permission?.name || '--';
      },
      [allPermissions],
    );

    // 获取数据的核心函数
    const fetchPermissions = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...searchFilters,
          };

          const res = await PermissionAPI.listFn({ data: requestData });
          const response = res.data;
          const permissionsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: permissionsList,
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
      fetchPermissions(filters, page);
    }, [fetchPermissions, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchPermissions(DEFAULT_FILTERS, 1);
    }, [fetchPermissions]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchPermissions(filtersToUse, pageToUse);
        },
      }),
      [fetchPermissions, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchPermissions(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchPermissions(filters, 1);
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      { title: t('permission.code'), render: (row) => row.code },
      { title: t('permission.name'), render: (row) => row.name },
      { title: t('permission.type'), render: (row) => row.type },
      { title: t('permission.resource'), render: (row) => row.resource || '--' },
      { title: t('permission.effect'), render: (row) => row.effect },
      { title: t('permission.scope'), render: (row) => row.scope },
      {
        title: t('permission.parent'),
        render: (row) => getPermissionName(row.parentId),
      },
      {
        title: t('columns.status'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
          />
        ),
      },
      {
        title: t('columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <PermissionActionButtons
            row={row}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', label: t('permission.code'), render: (row) => row.code },
      {
        type: 'content',
        label: t('permission.type'),
        render: (row) => row.type,
      },
      {
        type: 'content',
        label: t('permission.effect'),
        render: (row) => row.effect,
      },
      {
        type: 'content',
        label: t('permission.scope'),
        render: (row) => row.scope,
      },
      {
        type: 'content',
        label: t('columns.createTime'),
        render: (row) =>
          row.createTimeUtc ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss') : '--',
      },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            color={row.isEnabled ? 'success' : 'error'}
            size="small"
          />
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
        cardActions={(row) => (
          <PermissionActionButtons
            row={row}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        )}
      />
    );
  }),
);

export default TheTable;
