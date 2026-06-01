import React, { useState, useMemo } from 'react';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type AttendanceContext } from './components/TheTable';
import TheDetail from './components/TheDetail';
import AttendanceFormFields from './components/TheForm';
import * as AttendanceAPI from '@/api/enterprise/attendance';
import type { ListAttendanceReq, AttendanceObj } from '@/api/enterprise/type';
import type { SchemaCrudConfig } from '@/components/Crud';
import { Button } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';

/** 考勤记录扩展类型，增加 UI 专用时间字符串字段 */
export type AttendanceRecord = AttendanceObj & {
  /** UI 专用：打卡时间的 HH:mm:ss 字符串 */
  _checkInStr?: string;
  /** UI 专用：下班时间的 HH:mm:ss 字符串 */
  _checkOutStr?: string;
};

// ─── form 辅助函数（内联定义，避免混合导出破坏 Fast Refresh）────────

const formDefaultForm: Partial<AttendanceRecord> = {
  employeeId: undefined,
  date: dayjs().format('YYYY-MM-DD'),
  _checkInStr: '',
  _checkOutStr: '',
  status: 0,
  remark: '',
};

function formAfterOpen(
  form: Partial<AttendanceRecord>,
  isEdit: boolean,
  row?: AttendanceRecord,
): Partial<AttendanceRecord> {
  if (!isEdit || !row) return form;
  return {
    ...form,
    employeeId: row.employeeObj?.value ?? row.employeeId,
    date: row.date,
    _checkInStr: row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '',
    _checkOutStr: row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '',
    status: row.status,
    remark: row.remark || '',
  };
}

function formBeforeSubmit(form: Partial<AttendanceRecord>): Partial<AttendanceRecord> {
  const { _checkInStr, _checkOutStr, ...rest } = form;
  return {
    ...rest,
    employeeId: Number(form.employeeId),
    checkInTime: _checkInStr ? dayjs(`${form.date} ${_checkInStr}`).valueOf() : null,
    checkOutTime: _checkOutStr ? dayjs(`${form.date} ${_checkOutStr}`).valueOf() : null,
  };
}

function renderAttendanceForm(
  form: Partial<AttendanceRecord>,
  setForm: React.Dispatch<React.SetStateAction<Partial<AttendanceRecord>>>,
  _isMobile: boolean,
  t: (key: string) => string,
) {
  const updater = (patch: (prev: Partial<AttendanceRecord>) => Partial<AttendanceRecord>) =>
    setForm(patch);
  return <AttendanceFormFields form={form} setForm={updater} t={t} />;
}

// ─── 页面组件 ──────────────────────────────────────────────────────

export default function AttendanceManagement() {
  const t = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<AttendanceRecord | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // 1. 详情回调 Context
  const extraContext = useMemo<AttendanceContext>(
    () => ({
      onShowDetails: (row) => {
        setDetailRow(row as AttendanceRecord);
        setDetailsOpen(true);
      },
    }),
    [],
  );

  // 2. 编写 1000 条最大限制 CSV 前端智能格式化大批量异步下载
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const res = await AttendanceAPI.listFn({
        data: {
          pageNo: 1,
          pageSize: 1000,
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

  const config: SchemaCrudConfig<
    AttendanceRecord,
    FilterState,
    ListAttendanceReq,
    AttendanceContext
  > = {
    titleKey: 'enterprise.attendance.title',
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: AttendanceAPI.listFn as unknown as SchemaCrudConfig<
        AttendanceRecord,
        FilterState,
        ListAttendanceReq
      >['api']['list'],
      add: AttendanceAPI.addFn as unknown as SchemaCrudConfig<
        AttendanceRecord,
        FilterState,
        ListAttendanceReq
      >['api']['add'],
      update: AttendanceAPI.updateFn as unknown as SchemaCrudConfig<
        AttendanceRecord,
        FilterState,
        ListAttendanceReq
      >['api']['update'],
      delete: AttendanceAPI.deleteFn,
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
      schema: { type: 'object' },
      defaultForm: formDefaultForm,
      afterOpen: formAfterOpen,
      beforeSubmit: formBeforeSubmit,
      renderForm: renderAttendanceForm,
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
