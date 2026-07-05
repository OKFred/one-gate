import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { Box, Typography } from '@mui/material';

export default function HomePage() {
  const t = useTranslation();
  return (
    <PageLayout title={t('sidebar.menu.home')}>
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="h5" color="text.secondary">
          Welcome to Personal Portal (Coming Soon)
        </Typography>
      </Box>
    </PageLayout>
  );
}
