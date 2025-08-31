import { useRoutes } from 'react-router-dom';
import Login from './pages/login';
import Home from './pages/home';
import NotFound from './pages/error/NotFound';
import Layout from './pages/layout';

// 动态导入 pages 下除 error、layout、login 的页面
const modules = import.meta.glob('./pages/!(error|layout|login)/**/index.tsx', { eager: true });

// 自动生成 children 路由
import type { ReactElement, ComponentType } from 'react';

type RouteItem = { path: string; element: ReactElement };

const childrenRoutes: RouteItem[] = Object.entries(modules)
  .map(([path, mod]) => {
    // 取出页面名作为路由 path
    // 例如 ./pages/mail/index.tsx => mail
    const match = path.match(/\.\/pages\/(.*?)\/index\.tsx$/);
    const routePath = match ? match[1] : '';
    // 组件
    const Comp = (mod as { default: ComponentType<Record<string, unknown>> }).default;
    return routePath && Comp ? { path: routePath, element: <Comp /> } : null;
  })
  .filter((r): r is RouteItem => r !== null);

export default function AppRoutes() {
  return useRoutes([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: <Layout />, // 需要布局的页面
      children: childrenRoutes,
    },
    { path: '*', element: <NotFound /> },
  ]);
}
