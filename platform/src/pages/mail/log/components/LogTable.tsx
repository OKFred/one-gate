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
import type { ListMailLog } from '../type';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

interface LogTableProps {
  logs: ListMailLog[];
  loading: boolean;
  onView?: (log: ListMailLog) => void;
}

export default function LogTable({ logs, loading, onView }: LogTableProps) {
  const { isMobile } = useResponsive();
  const t = useTranslation();

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
                        <Chip icon={<SuccessIcon />} label="成功" color="success" size="small" />
                      ) : (
                        <Tooltip title={log.exceptionDetails || '发送失败'}>
                          <Chip icon={<ErrorIcon />} label="失败" color="error" size="small" />
                        </Tooltip>
                      )}
                      {onView && (
                        <IconButton onClick={() => onView(log)} color="primary" size="small">
                          <ViewIcon />
                        </IconButton>
                      )}
                    </Stack>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      收件人
                    </Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      {log.mailTo}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      发件人
                    </Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      {log.mailFrom}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      发送时间
                    </Typography>
                    <Typography variant="body1">{formatDate(log.createTimeUtc)}</Typography>
                  </Box>

                  {log.templateId && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        模板ID
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
                    <Chip icon={<SuccessIcon />} label="成功" color="success" size="small" />
                  ) : (
                    <Tooltip title={log.exceptionDetails || '发送失败'}>
                      <Chip icon={<ErrorIcon />} label="失败" color="error" size="small" />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{formatDate(log.createTimeUtc)}</TableCell>
                <TableCell align="center">
                  {onView && (
                    <IconButton onClick={() => onView(log)} color="primary" size="small">
                      <ViewIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
