import { Button } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { memo } from 'react';
import dayjs from 'dayjs';

interface ExportButtonProps {
  data: any[];
  fileName: string;
}

const ExportButton = memo(({ data, fileName }: ExportButtonProps) => {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headers = ['ID', 'Employee', 'Date', 'Check-In', 'Check-Out', 'Status', 'Remark'];
    const csvContent = [
      headers.join(','),
      ...data.map((row) => {
        const checkIn = row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '-';
        const checkOut = row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '-';
        const statusMap: Record<number, string> = { 0: 'Normal', 1: 'Late', 2: 'Early Leave', 3: 'Absent' };
        
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
      导出 CSV
    </Button>
  );
});

export default ExportButton;
