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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  Schedule as TimeIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import type { ListMailLog } from '../type';

interface LogDetailProps {
  open: boolean;
  log: ListMailLog | null;
  onClose: () => void;
}

export default function LogDetail({ open, log, onClose }: LogDetailProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
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
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <EmailIcon color="primary" />
          <Typography variant="h6" component="span">
            邮件详情 - ID: {log.id}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* 发送状态 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              发送状态
            </Typography>
            {log.sendStatus ? (
              <Chip 
                icon={<SuccessIcon />} 
                label="发送成功" 
                color="success" 
                variant="outlined"
              />
            ) : (
              <Chip 
                icon={<ErrorIcon />} 
                label="发送失败" 
                color="error" 
                variant="outlined"
              />
            )}
          </Box>

          <Divider />

          {/* 基本信息 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  邮件标题
                </Typography>
                <Typography variant="body1">
                  {log.title || '-'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  收件人
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                  {log.mailTo || '-'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  发件人
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
              时间信息
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  创建时间
                </Typography>
                <Typography variant="body1">
                  {formatDate(log.createTimeUtc)}
                </Typography>
              </Box>
              
              {log.updateTimeUtc && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    更新时间
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(log.updateTimeUtc)}
                  </Typography>
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
                  模板信息
                </Typography>
                <Stack spacing={2}>
                  {log.templateId && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        模板ID
                      </Typography>
                      <Typography variant="body1">
                        {log.templateId}
                      </Typography>
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
                  错误信息
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
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
