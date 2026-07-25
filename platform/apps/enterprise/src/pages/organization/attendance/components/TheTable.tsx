import { Chip, type ChipProps } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListAttendanceReq, AttendanceObj } from '@/api/enterprise/type';
import type { FilterState } from './TheFilter';

export interface AttendanceContext {
  onShowDetails: (row: AttendanceObj) => void;
}

const getStatusConfig = (status: number, t: (key: string) => string) => {
  const statusMap: Record<number, { label: string; color: ChipProps['color'] }> = {
    0: { label: t('organization.attendance.status.normal'), color: 'success' },
    1: { label: t('organization.attendance.status.late'), color: 'warning' },
    2: { label: t('organization.attendance.status.earlyLeave'), color: 'info' },
    3: { label: t('organization.attendance.status.absent'), color: 'error' },
  };
  return statusMap[status] || { label: t('column.noData'), color: 'default' };
};

export const tableConfig: SchemaCrudConfig<
  AttendanceObj,
  FilterState,
  ListAttendanceReq,
  AttendanceContext
>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    {
      title: t('organization.attendance.employee'),
      render: (row) => row.employeeObj?.label || '-',
    },
    { title: t('organization.attendance.date'), render: (row) => row.date },
    {
      title: t('organization.attendance.checkInTime'),
      render: (row) => (row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '-'),
    },
    {
      title: t('organization.attendance.checkOutTime'),
      render: (row) => (row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '-'),
    },
    {
      title: t('organization.attendance.status'),
      render: (row) => {
        const { label, color } = getStatusConfig(row.status, t);
        return <Chip label={label} color={color} size="small" variant="outlined" />;
      },
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.employeeObj?.label || '-' },
    { type: 'subtitle', label: t('organization.attendance.date'), render: (row) => row.date },
    {
      type: 'content',
      label: t('organization.attendance.checkInTime'),
      render: (row) => (row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '-'),
    },
    {
      type: 'content',
      label: t('organization.attendance.checkOutTime'),
      render: (row) => (row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '-'),
    },
    {
      type: 'tags',
      render: (row) => {
        const { label, color } = getStatusConfig(row.status, t);
        return <Chip label={label} color={color} size="small" />;
      },
    },
  ],

  actions: (_t, context) => [
    {
      key: 'details',
      icon: <VisibilityIcon />,
      color: 'info',
      onClick: (row) => {
        context?.onShowDetails(row);
      },
    },
  ],
};
