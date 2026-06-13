import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Typography,
  CircularProgress,
} from '@mui/material';
import dayjs from 'dayjs';
import * as CronAPI from '@/api/maintenance/cron';
import { useTranslation } from '@/hooks/useTranslation';
import type { CronObj, CronLogObj } from '@/api/maintenance/type';

export interface LogDialogProps {
  open: boolean;
  onClose: () => void;
  job: CronObj | null;
}

export default function LogDialog({ open, onClose, job }: LogDialogProps) {
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<CronLogObj[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const fetchLogs = useCallback(
    async (currentPage: number) => {
      if (!job?.id) return;
      setLoading(true);
      try {
        const res = await CronAPI.listLogsFn({
          data: {
            jobId: job.id,
            pageNo: currentPage,
            pageSize,
          },
        });
        const resData = res.data?.data;
        setLogs(resData?.list || []);
        setTotal(resData?.total || 0);
      } catch (err) {
        console.error('加载定时任务日志失败:', err);
      } finally {
        setLoading(false);
      }
    },
    [job?.id, pageSize],
  );

  useEffect(() => {
    if (open && job?.id) {
      setPage(1);
      fetchLogs(1);
    }
  }, [open, job?.id, fetchLogs]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchLogs(value);
  };

  const totalPage = Math.ceil(total / pageSize);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {t('cron.log.title')} - {job?.name || ''} ({job?.jobKey || ''})
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : logs.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">{t('cron.log.empty')}</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell width="60">{t('cron.log.id')}</TableCell>
                    <TableCell width="120">{t('cron.log.status')}</TableCell>
                    <TableCell width="180">{t('cron.log.startTime')}</TableCell>
                    <TableCell width="100">{t('cron.log.duration')}</TableCell>
                    <TableCell>{t('cron.log.detail')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{log.id}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.status ? t('cron.status.success') : t('cron.status.fail')}
                          color={log.status ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{dayjs(log.startTimeUtc).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                      <TableCell>{log.durationMs}ms</TableCell>
                      <TableCell sx={{ maxWidth: 300, wordBreak: 'break-all' }}>
                        {log.status ? (
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              {t('cron.log.success')}
                            </Typography>
                            {log.responseBody && (
                              <Box
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  bgcolor: 'action.hover',
                                  p: 0.5,
                                  borderRadius: 0.5,
                                  maxHeight: 80,
                                  overflowY: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  color: 'text.secondary',
                                }}
                              >
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(log.responseBody), null, 2);
                                  } catch {
                                    return log.responseBody;
                                  }
                                })()}
                              </Box>
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="error">
                            {log.errorMessage || t('cron.log.unknownError')}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPage > 1 && (
              <Stack direction="row" sx={{ justifyContent: 'center' }}>
                <Pagination
                  count={totalPage}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="small"
                />
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t('cron.button.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
