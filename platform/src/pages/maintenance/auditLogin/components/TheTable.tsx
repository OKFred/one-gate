import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import dayjs from 'dayjs';
import * as auditLoginAPI from '@/api/maintenance/auditLogin';
import type { ListLoginAuditRes } from '@/api/maintenance/type';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheFilter';

// 表格内部状态
export interface TheTableState {
  list: NonNullable<ListLoginAuditRes['list']>;
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
  orderBy: 'id',
  descend: true,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef } = localObj;
    const t = useTranslation();

    // 整合所有表格相关状态
    const [state, setState] = useState<TheTableState>({
      list: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { list, loading, page, pageSize, total, filters } = state;

    // 获取数据的核心函数
    const fetchLogs = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...(searchFilters.userId && { userId: searchFilters.userId }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await auditLoginAPI.listFn({ data: requestData });
          const response = res.data;
          const logsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: logsList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false, list: [], total: 0 }));
          filterRef.current?.updateCount(0);
        }
      },
      [state.pageSize, filterRef],
    );

    // 初始加载
    useEffect(() => {
      fetchLogs(DEFAULT_FILTERS, 1);
    }, [fetchLogs]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchLogs(filtersToUse, pageToUse);
        },
      }),
      [fetchLogs, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchLogs(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      fetchLogs(filters, 1);
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TheTableState['list'][0]>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      {
        title: t('maintenance.auditLogin.column.userId'),
        render: (row) => row.userId,
      },
      {
        title: t('maintenance.auditLogin.column.loginTime'),
        render: (row) => formatDate(row.loginTimeUtc),
      },
      {
        title: t('maintenance.auditLogin.column.ip'),
        render: (row) => row.ip || '-',
      },
      {
        title: t('maintenance.auditLogin.column.userAgent'),
        render: (row) => (
          <div
            style={{
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.userAgent || '-'}
          </div>
        ),
      },
      {
        title: t('column.remark'),
        render: (row) => row.remark || '-',
      },
      {
        title: t('columns.createTime'),
        render: (row) => formatDate(row.createTimeUtc),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TheTableState['list'][0]>[] = [
      { type: 'title', render: (row) => `User ID: ${row.userId}` },
      { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
      {
        type: 'content',
        label: t('maintenance.auditLogin.column.loginTime'),
        render: (row) => formatDate(row.loginTimeUtc),
      },
      {
        type: 'content',
        label: t('maintenance.auditLogin.column.ip'),
        render: (row) => row.ip || '-',
      },
      {
        type: 'content',
        label: t('maintenance.auditLogin.column.userAgent'),
        render: (row) => row.userAgent || '-',
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
      />
    );
  }),
);

TheTable.displayName = 'TheTable';

export default TheTable;
