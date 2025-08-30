// import Login from './pages/login';

import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import AppRoutes from './routes';

function App() {
  const navigate = useNavigate();
  return (
    <>
      <Button
        variant="contained"
        onClick={() => {
          navigate('/login');
        }}
      >
        Go to Login
      </Button>
      <AppRoutes />
    </>
  );
}

export default App;
