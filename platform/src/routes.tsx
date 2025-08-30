import { useRoutes } from 'react-router-dom';
import Login from './pages/login';
import NotFound from './pages/error/NotFound';

export default function AppRoutes() {
  return useRoutes([
    { path: '/login', element: <Login /> },
    // 可以在这里添加更多路由
    { path: '*', element: <NotFound /> },
  ]);
}
