import { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Divider,
  Chip,
  type ChipProps,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';
import type { AttendanceObj } from '@/api/enterprise/type';

export interface TheDetailProps {
  open: boolean;
  onClose: () => void;
  detail: AttendanceObj | null;
}

const TheDetail = memo(({ open, onClose, detail }: TheDetailProps) => {
  const t = useTranslation();
  const { isMobile } = useResponsive();

  if (!detail) return null;

  const getStatusChip = (status: number) => {
    const statusMap: Record<number, { label: string; color: ChipProps['color'] }> = {
      0: { label: t('organization.attendance.status.normal'), color: 'success' },
      1: { label: t('organization.attendance.status.late'), color: 'warning' },
      2: { label: t('organization.attendance.status.earlyLeave'), color: 'info' },
      3: { label: t('organization.attendance.status.absent'), color: 'error' },
    };
    const { label, color } = statusMap[status] || { label: t('column.noData'), color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('organization.attendance.detailTitle')}
        {isMobile && (
          <Button onClick={onClose}>
            <CloseIcon />
          </Button>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('organization.attendance.employee')}
            </Typography>
            <Typography variant="body1">{detail.employeeObj?.label || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('organization.attendance.date')}
            </Typography>
            <Typography variant="body1">{detail.date}</Typography>
          </Box>
          <Divider />
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('organization.attendance.checkInTime')}
              </Typography>
              <Typography variant="body1">
                {detail.checkInTime ? dayjs(detail.checkInTime).format('HH:mm:ss') : '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('organization.attendance.checkOutTime')}
              </Typography>
              <Typography variant="body1">
                {detail.checkOutTime ? dayjs(detail.checkOutTime).format('HH:mm:ss') : '-'}
              </Typography>
            </Box>
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('organization.attendance.status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>{getStatusChip(detail.status)}</Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('column.remark')}
            </Typography>
            <Typography variant="body2">{detail.remark || '无'}</Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('dialog.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

TheDetail.displayName = 'TheDetail';

export default TheDetail;
