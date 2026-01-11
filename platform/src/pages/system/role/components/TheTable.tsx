import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as RoleAPI from '@/api/system/role';
import { RoleActionButtons } from './TheActionButtons';
import type { ListRoleRes } from '@/api/system/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import type { FilterState } from './TheFilter';

// 表格内部状态
export interface TableState {
  list: NonNullable<ListRoleRes['list']>;
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

// 暴露给父组件的方法
export interface RoleTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: false,
};

const TheTable = memo(
  forwardRef<RoleTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;

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
    const fetchRoles = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...(searchFilters.keyword && { keyword: searchFilters.keyword }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await RoleAPI.listFn({ data: requestData });
          const response = res.data;
          const rolesList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: rolesList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [state.pageSize, filterRef],
    );

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(() => {
      fetchRoles(filters, page);
    }, [fetchRoles, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchRoles(DEFAULT_FILTERS, 1);
    }, [fetchRoles]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchRoles(filtersToUse, pageToUse);
        },
      }),
      [fetchRoles, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchRoles(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchRoles(filters, 1);
    };

    // 格式化时间
    const formatTime = (timestamp?: number | null) => {
      if (!timestamp) return '--';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: 'ID', render: (row) => row.id },
      { title: '角色名称', render: (row) => row.name },
      { title: '描述', render: (row) => row.description || '--' },
      {
        title: '状态',
        render: (row) => (
          <Chip
            label={row.isEnabled ? '已启用' : '已禁用'}
            color={row.isEnabled ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        title: '创建时间',
        render: (row) => formatTime(row.createTimeUtc),
      },
      {
        title: '更新时间',
        render: (row) => formatTime(row.updateTimeUtc),
      },
      {
        title: '操作',
        align: 'center',
        render: (row) => (
          <RoleActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => row.name },
      { type: 'subtitle', label: 'ID', render: (row) => row.id },
      { type: 'content', label: '描述', render: (row) => row.description || '--' },
      {
        type: 'content',
        label: '创建时间',
        render: (row) => formatTime(row.createTimeUtc),
      },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.isEnabled ? '已启用' : '已禁用'}
            color={row.isEnabled ? 'success' : 'default'}
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
          <RoleActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        )}
        emptyText="暂无角色"
      />
    );
  }),
);

export default TheTable;
