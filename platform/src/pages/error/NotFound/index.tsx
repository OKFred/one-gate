import { Link as RouterLink } from 'react-router-dom';
import { Typography, Button } from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';

const NotFound: React.FC = () => {
  const t = useTranslation();
  
  return (
    <div className="flex flex-col items-center">
      <Typography variant="h1" color="primary" gutterBottom>
        {t('error.notFound.title')}
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {t('error.notFound.message')}
      </Typography>
      <Button variant="contained" color="primary" component={RouterLink} to="/home" sx={{ mt: 20 }}>
        {t('error.notFound.backHome')}
      </Button>
    </div>
  );
};

export default NotFound;
