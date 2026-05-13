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
  Stack,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as ViewIcon,
  Key as KeyIcon,
  DataObject as ValueIcon,
} from '@mui/icons-material';
import * as CacheAPI from '@/api/maintenance/cache';
import type { GetCacheRes } from '@/api/maintenance/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheDetailRef {
  /** 打开详情对话框 */
  open: (key: string) => void;
}

const TheDetail = memo(
  forwardRef<TheDetailRef, Props>((_, ref) => {
    const { isMobile } = useResponsive();
    const t = useTranslation();
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ key: string; value: string } | null>(null);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        open: async (key: string) => {
          setOpen(true);
          setLoading(true);
          try {
            // Namespace is no longer needed
            const res = await CacheAPI.getFn({ data: { key, type: 'text' } });
            const responseData = res.data.data as GetCacheRes;
            setData({
              key,
              value:
                typeof responseData.value === 'string'
                  ? responseData.value
                  : JSON.stringify(responseData.value, null, 2),
            });
          } catch (error) {
            console.error('Failed to fetch cache detail:', error);
            setData({ key, value: 'Error loading value' });
          } finally {
            setLoading(false);
          }
        },
      }),
      [],
    );

    const handleClose = () => {
      setOpen(false);
      setData(null);
    };

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon />
            <Typography variant="h6" component="span">
              {t('page.details')}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography color="text.secondary">{t('common.loading')}...</Typography>
            </Box>
          ) : data ? (
            <Stack spacing={3} sx={{ py: 1 }}>
              {/* Key Information */}
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <KeyIcon fontSize="small" />
                  {t('cache.form.key')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium', wordBreak: 'break-all' }}>
                  {data.key}
                </Typography>
              </Box>

              <Divider />

              {/* Value Information */}
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <ValueIcon fontSize="small" />
                  {t('cache.form.value')}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    maxHeight: '400px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {data.value}
                </Box>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="contained">
            {t('dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheDetail.displayName = 'TheDetail';

export default TheDetail;
