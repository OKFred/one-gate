import { Button } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { memo } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import type { AttendanceObj } from '@/api/enterprise/type';

interface ExportButtonProps {
  data: AttendanceObj[];
  fileName: string;
}

const ExportButton = memo(({ data, fileName }: ExportButtonProps) => {
  const t = useTranslation();
  const handleExport = () => {
    if (!data || data.length === 0) return;

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
      ...data.map((row) => {
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
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      variant="outlined"
      startIcon={<DownloadIcon />}
      onClick={handleExport}
      sx={{ mb: 1, ml: 'auto', display: 'flex' }}
      size="small"
    >
      {t('enterprise.attendance.exportCsv')}
    </Button>
  );
});

export default ExportButton;
