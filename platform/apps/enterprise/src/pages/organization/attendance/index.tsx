import { useState } from 'react';
import dayjs from 'dayjs';
import { Button } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { enterpriseOrganizationAttendanceContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { TextField } from '@/components/Form';
import * as AttendanceAPI from '@/api/enterprise/organization/attendance';
import type { AttendanceObj, ListAttendanceReq } from '@/api/enterprise/type';

type AttendanceRecord = AttendanceObj & {
  employeeId?: number;
  _checkInStr?: string;
  _checkOutStr?: string;
} & Record<string, unknown>;

export default function AttendanceManagement() {
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportCSV = async (translate: (key: string) => string) => {
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
        translate('columns.id'),
        translate('organization.attendance.employee'),
        translate('organization.attendance.date'),
        translate('organization.attendance.checkInTime'),
        translate('organization.attendance.checkOutTime'),
        translate('organization.attendance.status'),
        translate('column.remark'),
      ];

      const statusMap: Record<number, string> = {
        0: translate('organization.attendance.status.normal'),
        1: translate('organization.attendance.status.late'),
        2: translate('organization.attendance.status.earlyLeave'),
        3: translate('organization.attendance.status.absent'),
      };

      const csvContent = [
        headers.join(','),
        ...list.map((row) => {
          const checkIn = row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '-';
          const checkOut = row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '-';
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

      const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_export_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // 全局 HTTP 拦截器统一展示错误
    } finally {
      setExportLoading(false);
    }
  };

  const renderTimeField =
    (
      fieldKey: '_checkInStr' | '_checkOutStr',
      labelKey: string,
    ): NonNullable<CrudExtensions<AttendanceRecord>['customFormFields']>[string] =>
    (ctx) => (
      <TextField
        name={fieldKey}
        label={ctx.t(labelKey)}
        type="time"
        value={ctx.form[fieldKey] ?? ''}
        disabled={ctx.disabled}
        onChange={(e) => ctx.setForm((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
        fullWidth
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { step: 1 },
        }}
      />
    );

  const extensions: CrudExtensions<AttendanceRecord> = {
    toolbarActions: (_helpers, translate) => (
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={() => void handleExportCSV(translate)}
        loading={exportLoading}
      >
        {translate('organization.attendance.exportCsv')}
      </Button>
    ),
    afterOpen: (form, isEdit, row) => {
      if (!isEdit || !row) {
        return {
          ...form,
          date: form.date || dayjs().format('YYYY-MM-DD'),
          _checkInStr: '',
          _checkOutStr: '',
        };
      }
      return {
        id: row.id,
        employeeId: row.employeeObj?.value ?? row.employeeId,
        date: row.date,
        _checkInStr: row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '',
        _checkOutStr: row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '',
        status: row.status,
        remark: row.remark ?? null,
      };
    },
    beforeSubmitAsync: async (form) => {
      const checkInStr = form._checkInStr;
      const checkOutStr = form._checkOutStr;
      return {
        id: form.id,
        employeeId:
          form.employeeId !== undefined &&
          form.employeeId !== null &&
          String(form.employeeId).trim() !== ''
            ? Number(form.employeeId)
            : undefined,
        date: form.date,
        checkInTime: checkInStr && form.date ? dayjs(`${form.date} ${checkInStr}`).valueOf() : null,
        checkOutTime:
          checkOutStr && form.date ? dayjs(`${form.date} ${checkOutStr}`).valueOf() : null,
        status: form.status,
        remark: form.remark,
      };
    },
    customFormFields: {
      checkInTime: renderTimeField('_checkInStr', 'organization.attendance.checkInTime'),
      checkOutTime: renderTimeField('_checkOutStr', 'organization.attendance.checkOutTime'),
    },
  };

  return (
    <ContractCrudPage contract={enterpriseOrganizationAttendanceContract} extensions={extensions} />
  );
}
