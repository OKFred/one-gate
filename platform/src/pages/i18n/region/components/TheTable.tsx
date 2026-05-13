import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip, Box } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as RegionAPI from '@/api/i18n/region';
import { RegionActionButtons } from './TheActionButtons';
import type { ListRegionReq, ListRegionRes } from '@/api/i18n/type';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

// 表格内部状态
export interface TableState {
  list: NonNullable<ListRegionRes['list']>;
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
  isEnabled: undefined,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef, enabledLanguages } = localObj;
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
    const fetchRegions = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData: ListRegionReq = {
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

          const res = await RegionAPI.listFn({ data: requestData });
          const response = res.data;
          const regionsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: regionsList,
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
      fetchRegions(filters, 1);
    }, [fetchRegions, filters]);

    // 初始加载
    useEffect(() => {
      fetchRegions(DEFAULT_FILTERS, 1);
    }, [fetchRegions]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchRegions(filtersToUse, pageToUse);
        },
      }),
      [fetchRegions, filters, page],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchRegions(filters, newPage);
    };

    // 处理每页条数变化
    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      // 重置到第一页并刷新数据
      fetchRegions(filters, 1);
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      // 动态添加语言列
      ...enabledLanguages
        .filter((lang) => lang.langCode)
        .map((lang) => ({
          title: lang.nativeName || lang.langCode || '',
          render: (row: TableState['list'][0]) =>
            (row.labels as Record<string, string | undefined>)?.[lang.langCode!] || '-',
        })),
      {
        title: t('region.table.alpha2Code'),
        render: (row) => (
          <Chip label={row.alpha2Code} size="small" color="primary" variant="outlined" />
        ),
      },
      {
        title: t('region.table.alpha3Code'),
        render: (row) => (
          <Chip label={row.alpha3Code} size="small" color="secondary" variant="outlined" />
        ),
      },
      { title: t('region.table.numeric'), render: (row) => row.numeric },
      {
        title: t('region.table.iso3166Independent'),
        render: (row) => (
          <Chip
            label={row.iso3166Independent ? t('column.yes') : t('column.no')}
            size="small"
            color={row.iso3166Independent ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        title: t('region.table.businessLanguages'),
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {row.businessLanguages && row.businessLanguages.length > 0 ? (
              row.businessLanguages.map((langCode) => {
                const lang = enabledLanguages.find((l) => l.langCode === langCode);
                return (
                  <Chip
                    key={langCode}
                    label={lang?.nativeName || langCode}
                    size="small"
                    variant="outlined"
                  />
                );
              })
            ) : (
              <span style={{ color: '#999' }}>-</span>
            )}
          </Box>
        ),
      },
      {
        title: t('filter.enabledStatus'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            size="small"
            color={row.isEnabled ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        title: t('columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <RegionActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      {
        type: 'title',
        render: (row) => {
          // 显示第一个语言的标签
          const firstLang = enabledLanguages[0];
          if (firstLang?.langCode) {
            return (
              (row.labels as Record<string, string | undefined>)?.[firstLang.langCode] ||
              row.alpha2Code
            );
          }
          return row.alpha2Code;
        },
      },
      { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
      // 动态添加语言字段
      ...enabledLanguages
        .filter((lang) => lang.langCode)
        .map((lang) => ({
          type: 'content' as const,
          label: lang.nativeName || lang.langCode || '',
          render: (row: TableState['list'][0]) =>
            (row.labels as Record<string, string | undefined>)?.[lang.langCode!] || '-',
        })),
      {
        type: 'tags',
        render: (row) => (
          <>
            <Chip label={row.alpha2Code} size="small" color="primary" variant="outlined" />
            <Chip label={row.alpha3Code} size="small" color="secondary" variant="outlined" />
            <Chip label={`#${row.numeric}`} size="small" variant="outlined" />
            <Chip
              label={row.iso3166Independent ? t('column.yes') : t('column.no')}
              size="small"
              color={row.iso3166Independent ? 'success' : 'default'}
              variant="outlined"
            />
            {row.businessLanguages && row.businessLanguages.length > 0 && (
              <>
                {row.businessLanguages.map((langCode) => {
                  const lang = enabledLanguages.find((l) => l.langCode === langCode);
                  return (
                    <Chip
                      key={langCode}
                      label={lang?.nativeName || langCode}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  );
                })}
              </>
            )}
            <Chip
              label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
              size="small"
              color={row.isEnabled ? 'success' : 'default'}
              variant="outlined"
            />
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
          <RegionActionButtons row={row} formRef={formRef} onDeleteSuccess={handleDeleteSuccess} />
        )}
      />
    );
  }),
);

export default TheTable;
