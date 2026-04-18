import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import { Chip } from '@mui/material';
import ResponsiveList, {
  type TableColumn,
  type CardField,
} from '@/components/Responsive/ResponsiveList';
import * as AttendanceAPI from '@/api/enterprise/attendance';
import { AttendanceActionButtons } from './TheActionButtons';
import type { Props } from '../index';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheFilter';
import ExportButton from './ExportButton';
import type { ListAttendanceRes, ListAttendanceReq, AttendanceObj } from '@/api/enterprise/type';

export interface TableState {
  list: ListAttendanceRes['list'];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

export interface TheTableRef {
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
  status: undefined,
  date: '',
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef, detailRef } = localObj;
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

    const fetchAttendances = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData: ListAttendanceReq = {
            ...searchFilters,
            pageNo: currentPage,
            pageSize: state.pageSize,
          };

          const res = await AttendanceAPI.listFn({ data: requestData });
          const responseData = res.data?.data;
          const attendanceList = responseData?.list || [];
          const totalCount = responseData?.total || 0;

          setState((prev) => ({
            ...prev,
            list: attendanceList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false, list: [], total: 0 }));
          filterRef.current?.updateCount(0);
        }
      },
      [state.pageSize, filterRef],
    );

    const handleDeleteSuccess = useCallback(() => {
      fetchAttendances(filters, page);
    }, [fetchAttendances, filters, page]);

    useEffect(() => {
      fetchAttendances(DEFAULT_FILTERS, 1);
    }, [fetchAttendances]);

    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page;
          fetchAttendances(filtersToUse, pageToUse);
        },
      }),
      [fetchAttendances, filters, page],
    );

    const handlePageChange = (newPage: number) => {
      fetchAttendances(filters, newPage);
    };

    const handlePageSizeChange = (newPageSize: number) => {
      setState((prev) => ({ ...prev, pageSize: newPageSize }));
      fetchAttendances(filters, 1);
    };

    const getStatusChip = (status: number) => {
      const statusMap: Record<
        number,
        { label: string; color: Parameters<typeof Chip>[0]['color'] }
      > = {
        0: { label: t('enterprise.attendance.status.normal'), color: 'success' },
        1: { label: t('enterprise.attendance.status.late'), color: 'warning' },
        2: { label: t('enterprise.attendance.status.earlyLeave'), color: 'info' },
        3: { label: t('enterprise.attendance.status.absent'), color: 'error' },
      };
      const { label, color } = statusMap[status] || { label: t('column.noData'), color: 'default' };
      return <Chip label={label} color={color} size="small" />;
    };

    const columns: TableColumn<AttendanceObj>[] = [
      { title: t('columns.id'), render: (row) => row.id },
      {
        title: t('enterprise.attendance.employee'),
        render: (row) => row.employeeObj?.label || '-',
      },
      { title: t('enterprise.attendance.date'), render: (row) => row.date },
      {
        title: t('enterprise.attendance.checkInTime'),
        render: (row) => (row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '-'),
      },
      {
        title: t('enterprise.attendance.checkOutTime'),
        render: (row) => (row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '-'),
      },
      {
        title: t('enterprise.attendance.status'),
        render: (row) => getStatusChip(row.status),
      },
      {
        title: t('table.actions'),
        align: 'center',
        render: (row) => (
          <AttendanceActionButtons
            row={row}
            formRef={formRef}
            detailRef={detailRef}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ),
      },
    ];

    const cardFields: CardField<AttendanceObj>[] = [
      { type: 'title', render: (row) => row.employeeObj?.label },
      { type: 'subtitle', label: t('enterprise.attendance.date'), render: (row) => row.date },
      {
        type: 'content',
        label: t('enterprise.attendance.checkInTime'),
        render: (row) => (row.checkInTime ? dayjs(row.checkInTime).format('HH:mm') : '-'),
      },
      {
        type: 'content',
        label: t('enterprise.attendance.checkOutTime'),
        render: (row) => (row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm') : '-'),
      },
      {
        type: 'tags',
        render: (row) => getStatusChip(row.status),
      },
    ];

    return (
      <>
        <ExportButton data={list} fileName={`Attendance_${dayjs().format('YYYYMMDD')}`} />
        <ResponsiveList
          data={list}
          loading={loading}
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          keyExtractor={(row) => row.id}
          columns={columns}
          cardFields={cardFields}
          cardActions={(row) => (
            <AttendanceActionButtons
              row={row}
              formRef={formRef}
              detailRef={detailRef}
              onDeleteSuccess={handleDeleteSuccess}
            />
          )}
        />
      </>
    );
  }),
);

export default TheTable;
