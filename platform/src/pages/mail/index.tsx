
import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

export default function Mail() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    // 只在精确 /mail 路径时重定向
    if (location.pathname === '/mail') {
      navigate('dashboard', { replace: true });
    }
  }, [navigate, location.pathname]);
  return <Outlet />;
}
