import { forwardRef, useState, useImperativeHandle, memo } from 'react';
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
import type { ListMailTemplateRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface ThePreviewRef {
  /** 打开预览对话框 */
  onOpen: (template: NonNullable<ListMailTemplateRes['list']>[0]) => void;
}

const ThePreview = memo(
  forwardRef<ThePreviewRef, Props>((_, ref) => {
    const theme = useTheme();
    const { isMobile } = useResponsive();
    const t = useTranslation();
    const [open, setOpen] = useState(false);
    const [template, setTemplate] = useState<NonNullable<ListMailTemplateRes['list']>[0] | null>(
      null,
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: (selectedTemplate: NonNullable<ListMailTemplateRes['list']>[0]) => {
          setTemplate(selectedTemplate);
          setOpen(true);
        },
      }),
      [],
    );

    const handleClose = () => {
      setOpen(false);
      setTemplate(null);
    };

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    if (!template) return null;

    return (
      <Dialog
        open={open}
        onClose={handleClose}
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
          <Box>{t('dialog.title.preview')}</Box>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
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
                {t('template.preview.basicInfo')}
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('columns.id')}
                  </Typography>
                  <Typography variant="body1">{template.id}</Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('template.table.name')}
                    </Typography>
                    <Typography variant="body1">{template.name || '-'}</Typography>
                  </Box>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('columns.createTime')}
                    </Typography>
                    <Typography variant="body1">{formatDate(template.createTimeUtc)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('columns.updateTime')}
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(template.updateTimeUtc || undefined)}
                    </Typography>
                  </Box>
                </Stack>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('template.preview.tags')}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {template.langCode && (
                      <Chip
                        label={`${t('column.language')}: ${template.langCode}`}
                        color="info"
                        size="small"
                      />
                    )}
                    {template.category && (
                      <Chip
                        label={`${t('column.category')}: ${template.category}`}
                        color="secondary"
                        size="small"
                      />
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* 邮件预览 */}
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('dialog.title.preview')}
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
                    {t('send.dialog.subject')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {template.title}
                  </Typography>
                </Box>

                {/* 邮件内容 */}
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('send.dialog.contentLabel')}
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
                    {template.content && (
                      <div
                        dangerouslySetInnerHTML={{ __html: template.content }}
                        style={{
                          fontFamily: theme.typography.body1.fontFamily,
                          fontSize: theme.typography.body1.fontSize,
                          lineHeight: theme.typography.body1.lineHeight,
                        }}
                      />
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
          <Button
            onClick={handleClose}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
          >
            {t('dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

ThePreview.displayName = 'ThePreview';

export default ThePreview;
