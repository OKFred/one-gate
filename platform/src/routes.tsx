import { useRoutes } from 'react-router-dom';

// 动态递归导入 pages 下除 error、login 的页面
const modules = import.meta.glob('./pages/!(error|login)/**/index.tsx', { eager: true });
import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';

// 递归构建路由树
function buildRouteTree(paths: [string, unknown][]): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const [filePath, mod] of paths) {
    // ./pages/mail/template/index.tsx => mail/template
    const match = filePath.match(/\.\/pages\/(.*?)\/index\.tsx$/);
    if (!match) continue;

    const routePath = match[1];
    const Comp = (mod as { default: ComponentType<Record<string, unknown>> }).default;

    routes.push({
      path: routePath,
      element: <Comp />,
    });
  }

  return routes;
}

const childrenRoutes = buildRouteTree(Object.entries(modules));

import Layout from './layout';
import Login from './pages/login';
import NotFound from './pages/error/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import RootRedirect from './components/RootRedirect';

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <RootRedirect />,
    },
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: childrenRoutes,
    },
    { path: '*', element: <NotFound /> },
  ]);
}
