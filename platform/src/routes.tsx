import { useRoutes } from 'react-router-dom';
import Login from './pages/login';

export default function AppRoutes() {
  return useRoutes([
    { path: '/login', element: <Login /> },
    // 可以在这里添加更多路由
  ]);
}
