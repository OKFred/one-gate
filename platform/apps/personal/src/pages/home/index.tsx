import { Box, Typography, Paper, Container } from '@mui/material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomePage() {
  const t = useTranslation();

  return (
    <PageLayout title={t('sidebar.menu.home')}>
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 6,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              background: 'background.paper',
            }}
          >
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {t('common.welcome')}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
              {t('common.welcomeSubtitle')}
            </Typography>
          </Paper>
        </Box>
      </Container>
    </PageLayout>
  );
}
