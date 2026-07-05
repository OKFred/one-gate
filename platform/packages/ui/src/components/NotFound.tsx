import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Typography, Button } from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import { useFirstValidPath } from '@/hooks/useFirstValidPath';

const NotFound: React.FC = () => {
  const t = useTranslation();
  const firstValidPath = useFirstValidPath();

  return (
    <div className="flex flex-col items-center">
      <Typography variant="h1" color="primary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {t('dialog.message')}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        component={RouterLink}
        to={firstValidPath}
        sx={{ mt: 20 }}
      >
        {t('dialog.goBackHome')}
      </Button>
    </div>
  );
};

export default NotFound;
