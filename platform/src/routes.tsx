
import { useRoutes } from 'react-router-dom';
import Login from './pages/login';
import Home from './pages/home';
import NotFound from './pages/error/NotFound';
import Layout from './pages/layout';

export default function AppRoutes() {
  return useRoutes([
    { path: '/login', element: <Login /> },
    {
      element: <Layout />, // 需要布局的页面
      children: [
        { path: '/home', element: <Home /> },
        // 这里可以继续添加需要布局的页面
      ],
    },
    { path: '*', element: <NotFound /> },
  ]);
}
