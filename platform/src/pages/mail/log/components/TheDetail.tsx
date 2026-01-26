import { forwardRef, useImperativeHandle, useState, memo } from 'react';
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
import type { ListMailLogRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';

// 暴露给父组件的方法
export interface TheDetailRef {
  /** 打开详情对话框 */
  open: (log: NonNullable<ListMailLogRes['list']>[0]) => void;
}

const TheDetail = memo(
  forwardRef<TheDetailRef, Props>((_, ref) => {
    const { isMobile } = useResponsive();
    const t = useTranslation();
    const [open, setOpen] = useState(false);
    const [log, setLog] = useState<NonNullable<ListMailLogRes['list']>[0] | null>(null);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        open: (selectedLog: NonNullable<ListMailLogRes['list']>[0]) => {
          setLog(selectedLog);
          setOpen(true);
        },
      }),
      [],
    );

    const handleClose = () => {
      setOpen(false);
      setLog(null);
    };

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
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <EmailIcon color="primary" />
            <Typography variant="h6" component="span">
              {t('page.details')}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* 发送状态 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                {t('columns.status')}
              </Typography>
              {log.sendStatus ? (
                <Chip
                  icon={<SuccessIcon />}
                  label={t('status.success')}
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  icon={<ErrorIcon />}
                  label={t('status.failure')}
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>

            <Divider />

            {/* 基本信息 */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('log.table.basicInfo')}
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('log.table.subject')}
                  </Typography>
                  <Typography variant="body1">{log.title || '-'}</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('log.table.recipient')}
                  </Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                    {log.mailTo || '-'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('log.table.sender')}
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
                {t('log.table.timeInfo')}
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('columns.createTime')}
                  </Typography>
                  <Typography variant="body1">{formatDate(log.createTimeUtc)}</Typography>
                </Box>

                {log.updateTimeUtc && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('columns.updateTime')}
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
                    {t('log.table.templateInfo')}
                  </Typography>
                  <Stack spacing={2}>
                    {log.templateParams && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          {t('log.table.templateParams')}
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
                    {t('log.table.errorInfo')}
                  </Typography>
                  {log.exceptionCode && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">{t('log.table.errorCode')}</Typography>
                      <Typography variant="body2">{log.exceptionCode}</Typography>
                    </Alert>
                  )}

                  {log.exceptionDetails && (
                    <Alert severity="error">
                      <Typography variant="subtitle2">
                        {t('log.table.errorDetails')}
                      </Typography>
                      <Typography variant="body2">{log.exceptionDetails}</Typography>
                    </Alert>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="primary" variant="contained">
            {t('dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheDetail.displayName = 'TheDetail';

export default TheDetail;
