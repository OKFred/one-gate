import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip, Box, Typography, Stack, Paper, Button } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as CacheAPI from '@/api/maintenance/cache';
import { CacheActionButtons } from './TheActionButtons';
import type { ListKeysRes, ListNamespacesRes } from '@/api/maintenance/type';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import { useTranslation } from '@/hooks/useTranslation';
import RefreshIcon from '@mui/icons-material/Refresh';

// 表格内部状态
export interface TableState {
  namespaces: NonNullable<ListNamespacesRes['namespaces']>;
  keys: NonNullable<ListKeysRes['keys']>;
  loading: boolean;
  selectedNamespace: string | null;
  filters: FilterState;
}

// 暴露给父组件的方法
export interface CacheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  namespace: '',
  keywordPrefix: '',
};

const TheTable = memo(
  forwardRef<CacheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
    const t = useTranslation();

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      namespaces: [],
      keys: [],
      loading: false,
      selectedNamespace: null,
      filters: DEFAULT_FILTERS,
    });

    const { namespaces, keys, loading, selectedNamespace, filters } = state;

    // 获取命名空间列表
    const fetchNamespaces = useCallback(async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const res = await CacheAPI.listNamespacesFn({ data: {} });
        const response = res.data;
        const namespacesList = response?.data?.namespaces || [];

        setState((prev) => ({
          ...prev,
          namespaces: namespacesList,
          loading: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, loading: false, namespaces: [] }));
      }
    }, []);

    // 获取指定命名空间的 keys
    const fetchKeys = useCallback(
      async (namespace: string, prefix?: string) => {
        if (!namespace) return;

        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            namespace,
            ...(prefix && { prefix }),
            limit: 1000,
          };

          const res = await CacheAPI.listKeysFn({ data: requestData });
          const response = res.data;
          const keysList = response?.data?.keys || [];

          setState((prev) => ({
            ...prev,
            keys: keysList,
            selectedNamespace: namespace,
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
      if (selectedNamespace) {
        fetchKeys(selectedNamespace, filters.keywordPrefix || undefined);
      }
    }, [selectedNamespace, filters.keywordPrefix, fetchKeys]);

    // 初始加载命名空间
    useEffect(() => {
      fetchNamespaces();
    }, [fetchNamespaces]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          setState((prev) => ({ ...prev, filters: filtersToUse }));

          if (filtersToUse.namespace) {
            fetchKeys(filtersToUse.namespace, filtersToUse.keywordPrefix || undefined);
          } else {
            fetchNamespaces();
          }
        },
      }),
      [filters, fetchKeys, fetchNamespaces],
    );

    // 当筛选条件改变时自动刷新
    useEffect(() => {
      if (filters.namespace) {
        fetchKeys(filters.namespace, filters.keywordPrefix || undefined);
      }
    }, [filters.namespace, filters.keywordPrefix, fetchKeys]);

    // 命名空间列表的列配置
    const namespaceColumns: TableColumn<TableState['namespaces'][0]>[] = [
      { title: t('cache.columns.namespace'), render: (row) => row.name },
      { title: t('cache.columns.keyCount'), render: (row) => row.keyCount },
      {
        title: t('cache.columns.ttl'),
        render: (row) => (row.expirationTtl ? `${row.expirationTtl}s` : t('common.permanent')),
      },
      {
        title: t('columns.actions'),
        render: (row) => (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setState((prev) => ({ ...prev, filters: { ...prev.filters, namespace: row.name } }));
            }}
          >
            {t('cache.actions.viewKeys')}
          </Button>
        ),
      },
    ];

    // 缓存键列表的列配置
    const keyColumns: TableColumn<TableState['keys'][0]>[] = [
      { title: t('cache.columns.key'), render: (row) => row.name },
      {
        title: t('columns.actions'),
        render: (row) => (
          <CacheActionButtons
            cacheKey={row}
            namespace={selectedNamespace!}
            formRef={formRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const namespaceCardFields: CardField<TableState['namespaces'][0]>[] = [
      { label: t('cache.columns.namespace'), render: (row) => row.name },
      { label: t('cache.columns.keyCount'), render: (row) => row.keyCount },
      {
        label: t('cache.columns.ttl'),
        render: (row) => (row.expirationTtl ? `${row.expirationTtl}s` : t('common.permanent')),
      },
    ];

    const keyCardFields: CardField<TableState['keys'][0]>[] = [
      { label: t('cache.columns.key'), render: (row) => row.name },
    ];

    return (
      <Box>
        {selectedNamespace && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {t('cache.currentNamespace')}: <Chip label={selectedNamespace} color="primary" />
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    selectedNamespace: null,
                    filters: DEFAULT_FILTERS,
                  }))
                }
              >
                {t('cache.actions.backToNamespaces')}
              </Button>
            </Stack>
          </Paper>
        )}

        {!selectedNamespace ? (
          <ResponsiveList
            data={namespaces}
            columns={namespaceColumns}
            cardFields={namespaceCardFields}
            loading={loading}
            page={1}
            total={namespaces.length}
            pageSize={1000}
            onPageChange={() => {}}
            keyExtractor={(row) => row.name}
          />
        ) : (
          <ResponsiveList
            data={keys}
            columns={keyColumns}
            cardFields={keyCardFields}
            loading={loading}
            page={1}
            total={keys.length}
            pageSize={1000}
            onPageChange={() => {}}
            keyExtractor={(row) => row.name}
          />
        )}
      </Box>
    );
  }),
);

TheTable.displayName = 'TheTable';
export default TheTable;
