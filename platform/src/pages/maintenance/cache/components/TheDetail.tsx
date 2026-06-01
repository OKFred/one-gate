import { useState, useEffect, memo } from 'react';
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
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

export interface TheDetailProps {
  open: boolean;
  onClose: () => void;
  cacheKey: string;
}

const TheDetail = memo(({ open, onClose, cacheKey }: TheDetailProps) => {
  const { isMobile } = useResponsive();
  const t = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ key: string; value: string } | null>(null);

  useEffect(() => {
    if (open && cacheKey) {
      async function fetchDetail() {
        setLoading(true);
        try {
          const res = await CacheAPI.getFn({ data: { key: cacheKey, type: 'text' } });
          const responseData = res.data.data as GetCacheRes;
          setData({
            key: cacheKey,
            value:
              typeof responseData.value === 'string'
                ? responseData.value
                : JSON.stringify(responseData.value, null, 2),
          });
        } catch (error) {
          console.error('Failed to fetch cache detail:', error);
          setData({ key: cacheKey, value: 'Error loading value' });
        } finally {
          setLoading(false);
        }
      }
      fetchDetail();
    } else {
      setData(null);
    }
  }, [open, cacheKey]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
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
        <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
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
        <Button onClick={onClose} variant="contained">
          {t('dialog.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

TheDetail.displayName = 'TheDetail';

export default TheDetail;
