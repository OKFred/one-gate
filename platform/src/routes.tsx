import { useRoutes } from 'react-router-dom';
import Login from './pages/login';
import Home from './pages/home';
import NotFound from './pages/error/NotFound';
import Layout from './pages/layout';
import Mail from './pages/mail';

export default function AppRoutes() {
  return useRoutes([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: <Layout />, // 需要布局的页面
      children: [
        { path: 'home', element: <Home /> },
        { path: 'mail', element: <Mail /> },
      ],
    },
    { path: '*', element: <NotFound /> },
  ]);
}
