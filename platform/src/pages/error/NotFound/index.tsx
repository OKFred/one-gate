import { Link as RouterLink } from 'react-router-dom';
import { Typography, Button } from '@mui/material';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center">
      <Typography variant="h1" color="primary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        页面未找到
      </Typography>
      <Button variant="contained" color="primary" component={RouterLink} to="/" sx={{ mt: 20 }}>
        返回首页
      </Button>
    </div>
  );
};

export default NotFound;
