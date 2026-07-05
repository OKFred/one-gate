import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Collapse } from '@mui/material';
import { Schedule as ScheduleIcon, Error as ErrorIcon } from '@mui/icons-material';
import * as CronAPI from '@/api/infra/maintenance/cron';
import { useTranslation } from '@/hooks/useTranslation';

export interface CronHelperProps {
  value: string;
}

export default function CronHelper({ value }: CronHelperProps) {
  const t = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    frequency: string;
    nextTimes: string[];
    error?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await CronAPI.parseFn({
          data: { cronExpression: value },
          ignoreAbort: true,
        });
        if (res.data?.data) {
          setResult(res.data.data);
        } else {
          setResult({
            valid: false,
            frequency: t('cron.helper.parseFailed'),
            nextTimes: [],
            error: t('cron.helper.noData'),
          });
        }
      } catch (err: unknown) {
        let errorMsg = t('cron.helper.networkError');
        if (err && typeof err === 'object') {
          const axiosError = err as Record<string, unknown>;
          if (axiosError.response && typeof axiosError.response === 'object') {
            const response = axiosError.response as Record<string, unknown>;
            if (response.data && typeof response.data === 'object') {
              const data = response.data as Record<string, unknown>;
              if (typeof data.message === 'string') {
                errorMsg = data.message;
              }
            }
          }
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
        setResult({
          valid: false,
          frequency: t('cron.helper.parseFailed'),
          nextTimes: [],
          error: errorMsg,
        });
      } finally {
        setLoading(false);
      }
    }, 1000); // 增加延迟，优化用户体验，避免频繁请求

    return () => clearTimeout(timer);
  }, [value, t]);

  if (!value.trim()) return null;

  return (
    <Collapse in={!!value.trim()}>
      <Box
        sx={{
          mt: 1.5,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: result?.valid ? 'divider' : 'error.main',
          bgcolor: result?.valid ? 'action.hover' : 'rgba(211, 47, 47, 0.08)',
          transition: 'all 0.3s ease',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              {t('cron.helper.parsing')}
            </Typography>
          </Box>
        ) : result ? (
          result.valid ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* 频率描述 */}
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {t('cron.helper.frequency')}
                  <Box component="span" sx={{ color: 'primary.main', ml: 0.5 }}>
                    {result.frequency}
                  </Box>
                </Typography>
              </Box>

              {/* 下次执行时间 */}
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}
                >
                  {t('cron.helper.nextTimes')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 0.5 }}>
                  {result.nextTimes.map((time, idx) => (
                    <Box
                      key={idx}
                      sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}
                    >
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {time}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 1 }}>
              <ErrorIcon color="error" fontSize="small" sx={{ mt: 0.2 }} />
              <Box>
                <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                  {t('cron.helper.invalid')}
                </Typography>
                <Typography
                  variant="caption"
                  color="error.main"
                  sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}
                >
                  {t('cron.helper.reason').replace('{error}', result.error || '')}
                </Typography>
              </Box>
            </Box>
          )
        ) : null}
      </Box>
    </Collapse>
  );
}
