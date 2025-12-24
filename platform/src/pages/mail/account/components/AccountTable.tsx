import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, { type TableColumn, type CardField } from '@/components/Responsive/ResponsiveList';
import * as mailAccountAPI from '@/api/mail/account';
import { AccountActionButtons } from './AccountButtons';
import type { ListMailAccount, FilterState } from '../type.d';
import type { Props } from '../type.d';

// 暴露给父组件的方法
export interface AccountTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
  /** 获取当前筛选条件 */
  getFilters: () => FilterState;
  /** 获取当前总数 */
  getTotal: () => number;
}

// 表格内部状态
interface TableState {
  accounts: ListMailAccount[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: false,
};

const AccountTable = memo(
  forwardRef<AccountTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      accounts: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { accounts, loading, page, pageSize, total, filters } = state;

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

          const res = await mailAccountAPI.listFn({ data: requestData });
          const response = res.data;
          const accountsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            accounts: accountsList,
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
        getFilters: () => filters,
        getTotal: () => total,
      }),
      [fetchAccounts, filters, page, total],
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
    const columns: TableColumn<ListMailAccount>[] = [
      { title: 'ID', render: (acc) => acc.id },
      { title: '昵称', render: (acc) => acc.nickname },
      { title: '邮箱', render: (acc) => acc.mailAddress },
      { title: '主机', render: (acc) => acc.host },
      { title: '端口', render: (acc) => acc.port },
      {
        title: '操作',
        align: 'center',
        render: (acc) => (
          <AccountActionButtons
            account={acc}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<ListMailAccount>[] = [
      { type: 'title', render: (acc) => acc.nickname },
      { type: 'subtitle', label: 'ID', render: (acc) => acc.id },
      { type: 'content', label: '邮箱地址', render: (acc) => acc.mailAddress },
      { type: 'content', label: 'SMTP服务器', render: (acc) => `${acc.host}:${acc.port}` },
      {
        type: 'tags',
        render: (acc) => (
          <>
            {acc.sslEnable && <Chip label="SSL" color="success" size="small" />}
            {acc.starttlsEnable && <Chip label="STARTTLS" color="info" size="small" />}
          </>
        ),
      },
    ];

    return (
      <ResponsiveList
        data={accounts}
        loading={loading}
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        keyExtractor={(acc) => acc.id!}
        columns={columns}
        cardFields={cardFields}
        cardActions={(acc) => (
          <AccountActionButtons
            account={acc}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        )}
        emptyText="暂无邮件账户"
      />
    );
  }),
);

AccountTable.displayName = 'AccountTable';

export default AccountTable;
