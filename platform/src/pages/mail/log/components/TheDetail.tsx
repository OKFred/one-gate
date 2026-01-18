import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  Schedule as TimeIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import type { ListMailLog } from '../type';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';

interface TheDetailProps {
  open: boolean;
  log: ListMailLog | null;
  onClose: () => void;
}

export default function TheDetail({ open, log, onClose }: TheDetailProps) {
  const { isMobile } = useResponsive();
  const t = useTranslation();

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };

  const formatTemplateParams = (params?: string) => {
    if (!params) return null;
    try {
      const parsed = JSON.parse(params);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return params;
    }
  };

  if (!log) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <EmailIcon color="primary" />
          <Typography variant="h6" component="span">
            {t('mail.log.detail.title')}: {log.id}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* 发送状态 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              {t('mail.log.detail.sendStatus')}
            </Typography>
            {log.sendStatus ? (
              <Chip icon={<SuccessIcon />} label={t('mail.log.detail.sendSuccess')} color="success" variant="outlined" />
            ) : (
              <Chip icon={<ErrorIcon />} label={t('mail.log.detail.sendFailed')} color="error" variant="outlined" />
            )}
          </Box>

          <Divider />

          {/* 基本信息 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('mail.log.detail.basicInfo')}
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('mail.log.columns.subject')}
                </Typography>
                <Typography variant="body1">{log.title || '-'}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('mail.log.columns.recipient')}
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                  {log.mailTo || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('mail.log.columns.sender')}
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                  {log.mailFrom || '-'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* 时间信息 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {t('mail.log.detail.timeInfo')}
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('common.columns.createTime')}
                </Typography>
                <Typography variant="body1">{formatDate(log.createTimeUtc)}</Typography>
              </Box>

              {log.updateTimeUtc && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('common.columns.updateTime')}
                  </Typography>
                  <Typography variant="body1">{formatDate(log.updateTimeUtc)}</Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* 模板信息 */}
          {(log.templateId || log.templateParams) && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  <TemplateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('mail.log.detail.templateInfo')}
                </Typography>
                <Stack spacing={2}>
                  {log.templateId && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        模板ID
                      </Typography>
                      <Typography variant="body1">{log.templateId}</Typography>
                    </Box>
                  )}

                  {log.templateParams && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        模板参数
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          backgroundColor: 'grey.100',
                          p: 2,
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          overflow: 'auto',
                          maxHeight: '200px',
                        }}
                      >
                        {formatTemplateParams(log.templateParams)}
                      </Box>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* 错误信息 */}
          {!log.sendStatus && (log.exceptionCode || log.exceptionDetails) && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom color="error">
                  {t('mail.log.detail.errorInfo')}
                </Typography>
                {log.exceptionCode && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">错误代码</Typography>
                    <Typography variant="body2">{log.exceptionCode}</Typography>
                  </Alert>
                )}

                {log.exceptionDetails && (
                  <Alert severity="error">
                    <Typography variant="subtitle2">错误详情</Typography>
                    <Typography variant="body2">{log.exceptionDetails}</Typography>
                  </Alert>
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
