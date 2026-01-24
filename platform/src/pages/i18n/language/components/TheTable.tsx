import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as LanguageAPI from '@/api/i18n/language';
import { LanguageActionButtons } from './TheActionButtons';
import type { ListLanguageReq, ListLanguageRes } from '@/api/i18n/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListLanguageReq['orderBy']>;
  descend: boolean;
  isEnabled?: boolean;
}

// 表格内部状态
export interface TableState {
  list: NonNullable<ListLanguageRes['list']>;
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
  isEnabled: undefined,
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
    const fetchLanguages = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...(searchFilters.keyword && { keyword: searchFilters.keyword }),
            ...(searchFilters.isEnabled !== undefined && { isEnabled: searchFilters.isEnabled }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await LanguageAPI.listFn({ data: requestData });
          const response = res.data;
          const languagesList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: languagesList,
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
      fetchLanguages(filters, page);
    }, [fetchLanguages, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchLanguages(DEFAULT_FILTERS, 1);
    }, [fetchLanguages]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchLanguages(filtersToUse, pageToUse);
        },
      }),
      [fetchLanguages, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchLanguages(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchLanguages(filters, 1);
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('common.columns.id'), render: (row) => row.id },
      { title: t('i18n.language.form.langCode'), render: (row) => row.langCode },
      { title: t('i18n.language.form.nativeName'), render: (row) => row.nativeName || '-' },
      { title: t('common.filter.sortOrder'), render: (row) => row.sortOrder },
      {
        title: t('common.filter.enabledStatus'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('common.status.enabled') : t('common.status.disabled')}
            color={row.isEnabled ? 'success' : 'default'}
            size="small"
          />
        ),
      },
      {
        title: t('common.columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('common.form.remark'),
        render: (row) => row.remark || '-',
      },
      {
        title: t('common.columns.actions'),
        align: 'center',
        render: (row) => (
          <LanguageActionButtons
            row={row}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => row.nativeName },
      { type: 'subtitle', label: t('common.columns.id'), render: (row) => row.id },
      { type: 'content', label: t('i18n.language.form.langCode'), render: (row) => row.langCode },
      {
        type: 'content',
        label: t('common.filter.sortOrder'),
        render: (row) => row.sortOrder,
      },
      {
        type: 'content',
        label: t('common.form.remark'),
        render: (row) => row.remark || '-',
      },
      {
        type: 'tags',
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('common.status.enabled') : t('common.status.disabled')}
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
          <LanguageActionButtons
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
