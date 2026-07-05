import { Box, Paper } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';

export default function OpenAPIDocPage() {
  const t = useTranslation();

  // 获取后端服务器地址
  const apiBaseUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
  const docUrl = `${apiBaseUrl}/doc_ref`;

  return (
    <PageLayout title={t('openapi.title')}>
      <Paper
        sx={{
          height: 'calc(100vh - 180px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          component="iframe"
          src={docUrl}
          sx={{
            width: '100%',
            height: '100%',
            border: 'none',
            flex: 1,
          }}
          title={t('openapi.title')}
        />
      </Paper>
    </PageLayout>
  );
}
