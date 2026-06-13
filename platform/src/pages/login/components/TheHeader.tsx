import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTranslation } from '@/hooks/useTranslation';

export default function TheHeader() {
  const t = useTranslation();

  return (
    <Box sx={{ textAlign: 'center', mb: 1 }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          fontWeight: 800,
          background: (theme) =>
            theme.palette.mode === 'light'
              ? 'linear-gradient(45deg, #1976d2 30%, #9c27b0 90%)'
              : 'linear-gradient(45deg, #90caf9 30%, #f48fb1 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1.5,
          letterSpacing: '0.5px',
        }}
      >
        {t('login.title')}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontWeight: 400,
          letterSpacing: '0.2px',
        }}
      >
        {t('login.subtitle')}
      </Typography>
    </Box>
  );
}
