import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip, Tooltip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import dayjs from 'dayjs';
import * as MailTemplateAPI from '@/api/mail/template';
import type { ListMailTemplateRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheFilter';
import { TemplateActionButtons } from './TheActionButtons';

// 表格内部状态
export interface TableState {
  list: NonNullable<ListMailTemplateRes['list']>;
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
  descend: true,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef, formRef, previewRef } = localObj;
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
    const fetchTemplates = useCallback(
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

          const res = await MailTemplateAPI.listFn({ data: requestData });
          const response = res.data;
          const templatesList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: templatesList,
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

    // 初始加载
    useEffect(() => {
      fetchTemplates(DEFAULT_FILTERS, 1);
    }, [fetchTemplates]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page;
          fetchTemplates(filtersToUse, pageToUse);
        },
      }),
      [fetchTemplates, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchTemplates(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchTemplates(filters, 1);
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    const truncateText = (text?: string, maxLength: number = 50) => {
      if (!text) return '-';
      return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    const stripHtml = (html?: string) => {
      if (!html) return '-';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      {
        title: t('template.table.title'),
        render: (row) => (
          <Tooltip title={row.title || ''}>
            <span>{truncateText(row.title, 30)}</span>
          </Tooltip>
        ),
      },
      {
        title: t('template.table.name'),
        render: (row) => (
          <Tooltip title={row.name || ''}>
            <span>{truncateText(row.name, 20)}</span>
          </Tooltip>
        ),
      },
      {
        title: t('dialog.title.preview'),
        render: (row) => truncateText(stripHtml(row.content), 40),
      },
      {
        title: t('columns.createTime'),
        render: (row) => formatDate(row.createTimeUtc),
      },
      {
        title: t('column.remark'),
        render: (row) => row.remark || '-',
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <TemplateActionButtons
            template={row}
            formRef={formRef}
            previewRef={previewRef}
            onDeleteSuccess={() => fetchTemplates(filters, 1)}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => row.title },
      {
        type: 'subtitle',
        label: `ID: ${t('template.table.name')}`,
        render: (row) => `${row.id} | ${row.name}`,
      },
      {
        type: 'content',
        label: t('dialog.title.preview'),
        render: (row) => truncateText(stripHtml(row.content), 100),
      },
      {
        type: 'content',
        label: t('columns.createTime'),
        render: (row) => formatDate(row.createTimeUtc),
      },
      {
        type: 'content',
        label: t('column.remark'),
        render: (row) => row.remark || '-',
      },
      {
        type: 'tags',
        render: (row) => (
          <>
            {row.langCode && <Chip label={row.langCode} color="info" size="small" />}
            {row.category && <Chip label={row.category} color="secondary" size="small" />}
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
        cardActions={(row) => (
          <TemplateActionButtons
            template={row}
            formRef={formRef}
            previewRef={previewRef}
            onDeleteSuccess={() => fetchTemplates(filters, 1)}
          />
        )}
      />
    );
  }),
);

TheTable.displayName = 'TheTable';

export default TheTable;
