import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Box } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as CacheAPI from '@/api/maintenance/cache';
import { CacheActionButtons } from './TheActionButtons';
import type { ListKeysRes } from '@/api/maintenance/type';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import { useTranslation } from '@/hooks/useTranslation';

// 表格内部状态
export interface TableState {
  keys: NonNullable<ListKeysRes['keys']>;
  loading: boolean;
  filters: FilterState;
}

// 暴露给父组件的方法
export interface CacheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keywordPrefix: '',
};

const TheTable = memo(
  forwardRef<CacheTableRef, Props>(({ localObj }, ref) => {
    const { detailRef, filterRef } = localObj;
    const t = useTranslation();

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      keys: [],
      loading: false,
      filters: DEFAULT_FILTERS,
    });

    const { keys, loading, filters } = state;

    // 获取 keys
    const fetchKeys = useCallback(
      async (prefix?: string) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            ...(prefix && { prefix }),
            limit: 1000,
          };

          const res = await CacheAPI.listKeysFn({ data: requestData });
          const response = res.data;
          const keysList = response?.data?.keys || [];

          setState((prev) => ({
            ...prev,
            keys: keysList,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(keysList.length);
        } catch {
          setState((prev) => ({ ...prev, loading: false, keys: [] }));
          filterRef.current?.updateCount(0);
        }
      },
      [filterRef],
    );

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(() => {
      fetchKeys(filters.keywordPrefix || undefined);
    }, [filters.keywordPrefix, fetchKeys]);

    // 初始加载
    useEffect(() => {
      fetchKeys();
    }, [fetchKeys]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          setState((prev) => ({ ...prev, filters: filtersToUse }));
          fetchKeys(filtersToUse.keywordPrefix || undefined);
        },
      }),
      [filters, fetchKeys],
    );

    // 当筛选条件改变时自动刷新
    useEffect(() => {
      fetchKeys(filters.keywordPrefix || undefined);
    }, [filters.keywordPrefix, fetchKeys]);

    // 缓存键列表的列配置
    const columns: TableColumn<TableState['keys'][0]>[] = [
      { title: t('cache.columns.key'), render: (row) => row.name },
      {
        title: t('columns.actions'),
        render: (row) => (
          <CacheActionButtons
            cacheKey={row}
            detailRef={detailRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['keys'][0]>[] = [
      { label: t('cache.columns.key'), render: (row) => row.name },
    ];

    return (
      <Box p={1}>
        <ResponsiveList
          data={keys}
          columns={columns}
          cardFields={cardFields}
          loading={loading}
          page={1}
          total={keys.length}
          pageSize={1000}
          onPageChange={() => {}}
          keyExtractor={(row) => row.name}
        />
      </Box>
    );
  }),
);

TheTable.displayName = 'TheTable';
export default TheTable;
