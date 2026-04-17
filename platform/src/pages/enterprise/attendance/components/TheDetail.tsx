import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
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
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import dayjs from 'dayjs';

export interface TheDetailRef {
  onOpen: (row: any) => void;
}

const TheDetail = memo(
  forwardRef<TheDetailRef, Props>(({ localObj }, ref) => {
    const { isMobile } = useResponsive();
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<any>(null);

    useImperativeHandle(ref, () => ({
      onOpen: (row: any) => {
        setDetail(row);
        setOpen(true);
      },
    }), []);

    const handleClose = () => {
      setOpen(false);
    };

    if (!detail) return null;

    const getStatusChip = (status: number) => {
      const statusMap: Record<number, { label: string; color: any }> = {
        0: { label: '正常', color: 'success' },
        1: { label: '迟到', color: 'warning' },
        2: { label: '早退', color: 'info' },
        3: { label: '旷工', color: 'error' },
      };
      const { label, color } = statusMap[status] || { label: '未知', color: 'default' };
      return <Chip label={label} color={color} size="small" />;
    };

    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          考勤详情
          {isMobile && <Button onClick={handleClose}><CloseIcon /></Button>}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">员工</Typography>
              <Typography variant="body1">{detail.employeeObj?.label || '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">日期</Typography>
              <Typography variant="body1">{detail.date}</Typography>
            </Box>
            <Divider />
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">签到时间</Typography>
                <Typography variant="body1">
                  {detail.checkInTime ? dayjs(detail.checkInTime).format('HH:mm:ss') : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">签退时间</Typography>
                <Typography variant="body1">
                  {detail.checkOutTime ? dayjs(detail.checkOutTime).format('HH:mm:ss') : '-'}
                </Typography>
              </Box>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">状态</Typography>
              <Box sx={{ mt: 0.5 }}>{getStatusChip(detail.status)}</Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">备注</Typography>
              <Typography variant="body2">{detail.remark || '无'}</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">关闭</Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheDetail;
