import { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AttendanceContext } from './components/TheTable';
import TheDetail from './components/TheDetail';
import * as AttendanceAPI from '@/api/enterprise/attendance';
import type { ListAttendanceReq, AttendanceObj } from '@/api/enterprise/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { Button } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';

export default function AttendanceManagement() {
  const t = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<AttendanceObj | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 1. 定义详情回调 Context
  const extraContext = useMemo<AttendanceContext>(
    () => ({
      onShowDetails: (row) => {
        setDetailRow(row);
        setDetailsOpen(true);
      },
    }),
    [],
  );

  // 2. 编写 10000 条最大限制 CSV 前端智能格式化大批量异步下载
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      // 批量拉取大批量最新数据
      const res = await AttendanceAPI.listFn({
        data: {
          pageNo: 1,
          pageSize: 10000,
        } as ListAttendanceReq,
      });

      const list = res.data?.data?.list || [];
      if (list.length === 0) return;

      const headers = [
        t('columns.id'),
        t('enterprise.attendance.employee'),
        t('enterprise.attendance.date'),
        t('enterprise.attendance.checkInTime'),
        t('enterprise.attendance.checkOutTime'),
        t('enterprise.attendance.status'),
        t('column.remark'),
      ];

      const csvContent = [
        headers.join(','),
        ...list.map((row) => {
          const checkIn = row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '-';
          const checkOut = row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '-';
          const statusMap: Record<number, string> = {
            0: t('enterprise.attendance.status.normal'),
            1: t('enterprise.attendance.status.late'),
            2: t('enterprise.attendance.status.earlyLeave'),
            3: t('enterprise.attendance.status.absent'),
          };

          return [
            row.id,
            `"${row.employeeObj?.label || '-'}"`,
            row.date,
            checkIn,
            checkOut,
            statusMap[row.status] || 'Unknown',
            `"${row.remark || ''}"`,
          ].join(',');
        }),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_export_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const config: SchemaCrudConfig<AttendanceObj, FilterState, ListAttendanceReq, AttendanceContext> =
    {
      titleKey: 'enterprise.attendance.title',
      apiKeyName: 'id',
      permissions: {},
      api: {
        list: AttendanceAPI.listFn,
      },
      filter: {
        defaultFilters,
        fields: filterConfig.fields,
        transformRequest: (filters) =>
          ({
            keyword: filters.keyword || undefined,
          }) as ListAttendanceReq,
      },
      table: {
        columns: tableConfig.columns,
        cardFields: tableConfig.cardFields,
        actions: tableConfig.actions,
      },
      form: {
        // 纯只读数据，无新增和修改
        schema: { type: 'object' },
        defaultForm: {},
      },
    };

  const customActions = (
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      onClick={handleExportCSV}
      loading={exportLoading}
    >
      {t('enterprise.attendance.exportCsv')}
    </Button>
  );

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} customActions={customActions} />

      <TheDetail
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setDetailRow(null);
        }}
        detail={detailRow}
      />
    </>
  );
}
