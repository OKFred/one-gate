import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  useTheme,
  IconButton,
  Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import type { ListMailTemplate } from '../type';
import { useResponsive } from '@/hooks/useResponsive';

interface TemplatePreviewProps {
  open: boolean;
  template: ListMailTemplate | null;
  onClose: () => void;
}

export default function TemplatePreview({ open, template, onClose }: TemplatePreviewProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
  };

  if (!template) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(2),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 32px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: isMobile ? 1 : 2,
        }}
      >
        <Box>模板预览</Box>
        {isMobile && (
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          pb: isMobile ? 1 : 2,
          px: isMobile ? 2 : 3,
        }}
      >
        <Stack spacing={3}>
          {/* 模板基本信息 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  模板ID
                </Typography>
                <Typography variant="body1">{template.id}</Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    模板名称
                  </Typography>
                  <Typography variant="body1">{template.name || '-'}</Typography>
                </Box>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    创建时间
                  </Typography>
                  <Typography variant="body1">{formatDate(template.createTimeUtc)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    更新时间
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(template.updateTimeUtc || undefined)}
                  </Typography>
                </Box>
              </Stack>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  标签
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {template.langCode && (
                    <Chip label={`语言: ${template.langCode}`} color="info" size="small" />
                  )}
                  {template.category && (
                    <Chip label={`分类: ${template.category}`} color="secondary" size="small" />
                  )}
                  {!template.langCode && !template.category && (
                    <Typography variant="body2" color="text.secondary">
                      无标签
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* 邮件预览 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              邮件预览
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              {/* 邮件头部 */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  主题
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {template.title || '(无主题)'}
                </Typography>
              </Box>

              {/* 邮件内容 */}
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  邮件内容
                </Typography>
                <Box
                  sx={{
                    minHeight: 200,
                    maxHeight: 400,
                    overflow: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  {template.content ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: template.content }}
                      style={{
                        fontFamily: theme.typography.body1.fontFamily,
                        fontSize: theme.typography.body1.fontSize,
                        lineHeight: theme.typography.body1.lineHeight,
                      }}
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      style={{ fontStyle: 'italic' }}
                    >
                      (无内容)
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
        }}
      >
        <Button onClick={onClose} fullWidth={isMobile} size={isMobile ? 'large' : 'medium'}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
