import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as AccountAPI from '@/api/mail/account';
import { AccountActionButtons } from './TheActionButtons';
import type { ListMailAccountRes } from '@/api/mail/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheFilter';

// 表格内部状态
export interface TableState {
  list: NonNullable<ListMailAccountRes['list']>;
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
  orderBy: 'id',
  descend: false,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
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
    const fetchAccounts = useCallback(
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

          const res = await AccountAPI.listFn({ data: requestData });
          const response = res.data;
          const accountsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: accountsList,
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
      fetchAccounts(filters, page);
    }, [fetchAccounts, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchAccounts(DEFAULT_FILTERS, 1);
    }, [fetchAccounts]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchAccounts(filtersToUse, pageToUse);
        },
      }),
      [fetchAccounts, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchAccounts(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchAccounts(filters, 1);
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      { title: t('account.table.nickname'), render: (row) => row.nickname },
      { title: t('account.table.email'), render: (row) => row.mailAddress },
      { title: t('account.table.host'), render: (row) => row.host },
      { title: t('account.table.port'), render: (row) => row.port },
      {
        title: t('columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('column.remark'),
        render: (row) => row.remark || '-',
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <AccountActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => row.nickname },
      { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
      { type: 'content', label: t('account.table.email'), render: (row) => row.mailAddress },
      {
        type: 'content',
        label: t('account.table.host') + ':' + t('account.table.port'),
        render: (row) => `${row.host}:${row.port}`,
      },
      {
        type: 'content',
        label: t('column.remark'),
        render: (row) => row.remark || '-',
      },
      {
        type: 'tags',
        render: (row) => <Chip label={row.port} color="success" size="small" />,
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
          <AccountActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        )}
      />
    );
  }),
);

export default TheTable;
