import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip, Tooltip, IconButton } from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import dayjs from 'dayjs';
import * as mailLogAPI from '@/api/mail/log';
import type { ListMailLogReq, ListMailLogRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailLogReq['orderBy']>;
  descend: boolean;
}

// 表格内部状态
export interface TableState {
  list: NonNullable<ListMailLogRes['list']>;
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
    const { filterRef, detailRef } = localObj;
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
    const fetchLogs = useCallback(
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

          const res = await mailLogAPI.listFn({ data: requestData });
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
          setState((prev) => ({ ...prev, loading: false }));
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
      // 重置到第一页并刷新数据
      fetchLogs(filters, 1);
    };

    const handleViewLog = (log: NonNullable<ListMailLogRes['list']>[0]) => {
      detailRef.current?.open(log);
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    const truncateText = (text?: string, maxLength = 30) => {
      if (!text) return '-';
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    };

    // 表格列配置（PC端）
    const columns: TableColumn<TableState['list'][0]>[] = [
      { title: t('common.columns.id'), render: (row) => row.id },
      {
        title: t('mail.log.columns.subject'),
        render: (row) => (
          <Tooltip title={row.title || ''}>
            <span>{truncateText(row.title, 30)}</span>
          </Tooltip>
        ),
      },
      {
        title: t('mail.log.columns.recipient'),
        render: (row) => (
          <Tooltip title={row.mailTo || ''}>
            <span>{truncateText(row.mailTo, 25)}</span>
          </Tooltip>
        ),
      },
      {
        title: t('mail.log.columns.sender'),
        render: (row) => (
          <Tooltip title={row.mailFrom || ''}>
            <span>{truncateText(row.mailFrom, 25)}</span>
          </Tooltip>
        ),
      },
      {
        title: t('common.columns.status'),
        align: 'center',
        render: (row) =>
          row.sendStatus ? (
            <Chip
              icon={<SuccessIcon />}
              label={t('common.status.success')}
              color="success"
              size="small"
            />
          ) : (
            <Tooltip title={row.exceptionDetails || t('mail.log.sendFailed')}>
              <Chip
                icon={<ErrorIcon />}
                label={t('common.status.failed')}
                color="error"
                size="small"
              />
            </Tooltip>
          ),
      },
      {
        title: t('mail.log.columns.sendTime'),
        render: (row) => formatDate(row.createTimeUtc),
      },
      {
        title: t('common.columns.actions'),
        align: 'center',
        render: (row) => (
          <IconButton onClick={() => handleViewLog(row)} color="primary" size="small">
            <ViewIcon />
          </IconButton>
        ),
      },
    ];

    // 卡片字段配置（移动端）
    const cardFields: CardField<TableState['list'][0]>[] = [
      { type: 'title', render: (row) => truncateText(row.title, 40) },
      { type: 'subtitle', label: t('common.columns.id'), render: (row) => row.id },
      {
        type: 'content',
        label: t('mail.log.columns.recipient'),
        render: (row) => row.mailTo,
      },
      {
        type: 'content',
        label: t('mail.log.columns.sender'),
        render: (row) => row.mailFrom,
      },
      {
        type: 'content',
        label: t('mail.log.columns.sendTime'),
        render: (row) => formatDate(row.createTimeUtc),
      },
      {
        type: 'tags',
        render: (row) =>
          row.sendStatus ? (
            <Chip
              icon={<SuccessIcon />}
              label={t('common.status.success')}
              color="success"
              size="small"
            />
          ) : (
            <Chip
              icon={<ErrorIcon />}
              label={t('common.status.failed')}
              color="error"
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
          <IconButton onClick={() => handleViewLog(row)} color="primary" size="small">
            <ViewIcon />
          </IconButton>
        )}
      />
    );
  }),
);

TheTable.displayName = 'TheTable';

export default TheTable;
