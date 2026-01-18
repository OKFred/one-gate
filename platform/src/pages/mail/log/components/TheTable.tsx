import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import * as mailLogAPI from '@/api/mail/log';
import type { ListMailLogReq, ListMailLogRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailLogReq['orderBy']>;
  descend: boolean;
}

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: true,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef, detailRef } = localObj;
    const { isMobile } = useResponsive();
    const t = useTranslation();
    const [logs, setLogs] = useState<NonNullable<ListMailLogRes['list']>>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

    const fetchLogs = useCallback(
      async (searchParams: FilterState) => {
        setLoading(true);
        try {
          const requestData = {
            pageNo: 1,
            pageSize: 100,
            ...(searchParams.keyword && { keyword: searchParams.keyword }),
            orderBy: searchParams.orderBy,
            descend: searchParams.descend,
          };

          const res = await mailLogAPI.listFn({ data: requestData });
          const response = res.data;
          const logsList = response?.data?.list || [];
          const total = response?.data?.total || 0;

          setLogs(logsList);
          filterRef.current?.updateCount(total);
        } finally {
          setLoading(false);
        }
      },
      [filterRef],
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const targetFilters = newFilters || filters;
          setFilters(targetFilters);
          fetchLogs(targetFilters);
        },
      }),
      [filters, fetchLogs],
    );

    // 初始化加载
    useEffect(() => {
      fetchLogs(DEFAULT_FILTERS);
    }, [fetchLogs]);

    const handleViewLog = (log: NonNullable<ListMailLogRes['list']>[0]) => {
      detailRef.current?.open(log);
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    const truncateText = (text?: string, maxLength = 30) => {
      if (!text) return '-';
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    };

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    // 移动端卡片布局
    if (isMobile) {
      return (
        <Box sx={{ mt: 2, mb: 8 }}>
          {logs.length > 0 ? (
            <Stack spacing={2}>
              {logs.map((log) => (
                <Card key={log.id} variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div" gutterBottom>
                          {truncateText(log.title, 40)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          ID: {log.id}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {log.sendStatus ? (
                          <Chip
                            icon={<SuccessIcon />}
                            label={t('common.status.success')}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Tooltip title={log.exceptionDetails || t('mail.log.sendFailed')}>
                            <Chip
                              icon={<ErrorIcon />}
                              label={t('common.status.failed')}
                              color="error"
                              size="small"
                            />
                          </Tooltip>
                        )}
                        <IconButton onClick={() => handleViewLog(log)} color="primary" size="small">
                          <ViewIcon />
                        </IconButton>
                      </Stack>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('mail.log.columns.recipient')}
                      </Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {log.mailTo}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('mail.log.columns.sender')}
                      </Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {log.mailFrom}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('mail.log.columns.sendTime')}
                      </Typography>
                      <Typography variant="body1">{formatDate(log.createTimeUtc)}</Typography>
                    </Box>

                    {log.templateId && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('mail.log.columns.templateId')}
                        </Typography>
                        <Typography variant="body1">{log.templateId}</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                {t('mail.log.empty')}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    // 桌面端表格布局
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.columns.id')}</TableCell>
              <TableCell>{t('mail.log.columns.subject')}</TableCell>
              <TableCell>{t('mail.log.columns.recipient')}</TableCell>
              <TableCell>{t('mail.log.columns.sender')}</TableCell>
              <TableCell align="center">{t('common.columns.status')}</TableCell>
              <TableCell>{t('mail.log.columns.sendTime')}</TableCell>
              <TableCell align="center">{t('common.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length > 0 &&
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.id}</TableCell>
                  <TableCell>
                    <Tooltip title={log.title || ''}>
                      <span>{truncateText(log.title, 30)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={log.mailTo || ''}>
                      <span>{truncateText(log.mailTo, 25)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={log.mailFrom || ''}>
                      <span>{truncateText(log.mailFrom, 25)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    {log.sendStatus ? (
                      <Chip
                        icon={<SuccessIcon />}
                        label={t('common.status.success')}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Tooltip title={log.exceptionDetails || t('mail.log.sendFailed')}>
                        <Chip
                          icon={<ErrorIcon />}
                          label={t('common.status.failed')}
                          color="error"
                          size="small"
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(log.createTimeUtc)}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleViewLog(log)} color="primary" size="small">
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }),
);

TheTable.displayName = 'TheTable';

export default TheTable;
