import { useImperativeHandle, useState, useEffect } from 'react';
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

// 外部请求参数接口
interface FetchQueryParams<TFilters> {
  filters: TFilters;
  page: number;
  pageSize: number;
}

// 标准表格筛选接口限制，防止 any 校验报错
interface StandardTableFilters {
  keyword?: string;
  orderBy?: string;
  descend?: boolean;
}

// 通用的表格数据加载工厂函数，支持高度配置化与泛型复用（去除 export 以免破坏 Fast Refresh）
function createTableFetcher<TFilters extends StandardTableFilters, TRecord, TApiData>(
  listApi: (args: {
    data: TApiData;
  }) => Promise<{ data: { data?: { list?: TRecord[]; total?: number } } }>,
) {
  return async (
    params: FetchQueryParams<TFilters>,
    setState: React.Dispatch<
      React.SetStateAction<{
        list: TRecord[];
        loading: boolean;
        page: number;
        pageSize: number;
        total: number;
        filters: TFilters;
      }>
    >,
    filterRef: React.RefObject<{ updateCount: (count: number) => void } | null>,
  ) => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { filters, page, pageSize } = params;
      const requestData = {
        pageNo: page,
        pageSize,
        ...(filters.keyword && { keyword: filters.keyword }),
        orderBy: filters.orderBy,
        descend: filters.descend,
      } as unknown as TApiData;

      const res = await listApi({ data: requestData });
      const response = res.data;
      const dataList = response?.data?.list || [];
      const totalCount = response?.data?.total || 0;

      setState((prev) => ({
        ...prev,
        list: dataList as TRecord[],
        total: totalCount,
        page,
        filters,
        loading: false,
      }));

      // 通知筛选组件更新数量
      filterRef.current?.updateCount(totalCount);
    } catch {
      setState((prev) => ({
        ...prev,
        list: [],
        total: 0,
        loading: false,
      }));
      filterRef.current?.updateCount(0);
    }
  };
}

// 用工厂一键构建 fetchAccounts，完美映射 API 自动生成的类型，零 any 零硬编码
const fetchAccounts = createTableFetcher<
  FilterState,
  TableState['list'][0],
  NonNullable<Parameters<typeof AccountAPI.listFn>[0]>['data']
>(AccountAPI.listFn);

export default function TheTable({ localObj, ref }: Props & { ref?: React.Ref<TheTableRef> }) {
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

  // 删除成功后的回调
  const handleDeleteSuccess = () => {
    fetchAccounts({ filters, page: 1, pageSize }, setState, filterRef);
  };

  // 初始加载
  useEffect(() => {
    fetchAccounts({ filters: DEFAULT_FILTERS, page: 1, pageSize: 10 }, setState, filterRef);
  }, [filterRef]);

  // 暴露给父组件的方法
  useImperativeHandle(
    ref,
    () => ({
      refresh: (newFilters?: FilterState) => {
        const filtersToUse = newFilters || filters;
        const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
        fetchAccounts({ filters: filtersToUse, page: pageToUse, pageSize }, setState, filterRef);
      },
    }),
    [filters, page, pageSize, filterRef],
  );

  // 处理分页
  const handlePageChange = (newPage: number) => {
    fetchAccounts({ filters, page: newPage, pageSize }, setState, filterRef);
  };

  // 处理每页条数变化
  const handlePageSizeChange = (newPageSize: number) => {
    setState((prev) => ({ ...prev, pageSize: newPageSize }));
    // 重置到第一页并刷新数据
    fetchAccounts({ filters, page: 1, pageSize: newPageSize }, setState, filterRef);
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
}
