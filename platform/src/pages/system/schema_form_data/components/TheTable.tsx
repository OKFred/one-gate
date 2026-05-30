import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as SchemaFormDataAPI from '@/api/system/schemaFormData';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import type { ListSchemaFormDataReq, ListSchemaFormDataRes } from '@/api/system/type';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import { RowActionButtons } from './TheActionButtons';

export type SchemaFormDataItem = NonNullable<ListSchemaFormDataRes['list']>[0];

export interface TheTableRef {
  refresh: (filters?: FilterState) => void;
}

export interface TableState {
  list: SchemaFormDataItem[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  formCode: '',
  businessId: undefined,
  orderBy: 'id',
  descend: true,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { detailsRef, filterRef } = localObj;
    const t = useTranslation();

    const [state, setState] = useState<TableState>({
      list: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { list, loading, page, pageSize, total, filters } = state;

    const fetchRecords = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData: ListSchemaFormDataReq = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          if (searchFilters.formCode) {
            requestData.formCode = searchFilters.formCode;
          }
          if (searchFilters.businessId !== undefined) {
            requestData.businessId = searchFilters.businessId;
          }

          const res = await SchemaFormDataAPI.listFn({ data: requestData });
          const response = res.data;
          const recordsList = (response?.data?.list || []) as SchemaFormDataItem[];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: recordsList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
          setState((prev) => ({ ...prev, list: [], total: 0 }));
          filterRef.current?.updateCount(0);
        }
      },
      [state.pageSize, filterRef],
    );

    const handleDeleteSuccess = useCallback(() => {
      fetchRecords(filters, 1);
    }, [fetchRecords, filters]);

    useEffect(() => {
      fetchRecords(DEFAULT_FILTERS, 1);
    }, [fetchRecords]);

    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page;
          fetchRecords(filtersToUse, pageToUse);
        },
      }),
      [fetchRecords, filters, page],
    );

    const handlePageChange = (newPage: number) => {
      fetchRecords(filters, newPage);
    };

    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      fetchRecords(filters, 1);
    };

    // 格式化展示的提交数据
    const formatDataSummary = (dataContent: string) => {
      try {
        const obj = JSON.parse(dataContent);
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        const summary = keys
          .slice(0, 3)
          .map((k) => `${k}: ${typeof obj[k] === 'object' ? '...' : obj[k]}`)
          .join(', ');
        return keys.length > 3 ? `{ ${summary}, ... }` : `{ ${summary} }`;
      } catch {
        return dataContent || '-';
      }
    };

    const columns: TableColumn<SchemaFormDataItem>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      {
        title: t('schemaForm.code'),
        render: (row) => (
          <Chip label={row.formCode} size="small" color="primary" variant="outlined" />
        ),
      },
      {
        title: t('schemaFormData.filter.businessId'),
        render: (row) => (
          <Chip label={String(row.businessId)} size="small" color="secondary" variant="outlined" />
        ),
      },
      {
        title: t('schemaFormData.dataSummary'),
        render: (row) => (
          <span style={{ fontSize: '0.85rem', color: '#555', fontFamily: 'Consolas, monospace' }}>
            {formatDataSummary(row.dataContent || '{}')}
          </span>
        ),
      },
      { title: t('column.creatorName'), render: (row) => row.creatorName || '-' },
      { title: t('column.updaterName'), render: (row) => row.updaterName || '-' },
      {
        title: t('columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <RowActionButtons
            row={row}
            detailsRef={detailsRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    const cardFields: CardField<SchemaFormDataItem>[] = [
      {
        type: 'title',
        render: (row) => `${t('schemaFormData.filter.businessId')}: ${row.businessId}`,
      },
      { type: 'subtitle', label: t('schemaForm.code'), render: (row) => row.formCode },
      {
        type: 'content',
        label: t('schemaFormData.submittedData'),
        render: (row) => formatDataSummary(row.dataContent || '{}'),
      },
      {
        type: 'tags',
        render: (row) => <Chip label={`ID: ${row.id}`} size="small" variant="outlined" />,
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
          <RowActionButtons
            row={row}
            detailsRef={detailsRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        )}
      />
    );
  }),
);

export default TheTable;
