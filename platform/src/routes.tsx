import { useRoutes } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';

// 🚀 懒加载模式：页面仅在访问时才加载（去除 eager: true）
const modules = import.meta.glob('./pages/!(error|login)/**/index.tsx');

// 递归构建路由树（懒加载版本）
function buildRouteTree(paths: [string, () => Promise<unknown>][]): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const [filePath, loader] of paths) {
    // ./pages/mail/template/index.tsx => mail/template
    const match = filePath.match(/\.\/pages\/(.*?)\/index\.tsx$/);
    if (!match) continue;

    const routePath = match[1];
    // 使用 lazy 实现懒加载
    const LazyComp = lazy(() =>
      loader().then((mod) => ({
        default: (mod as { default: ComponentType<Record<string, unknown>> }).default,
      })),
    );

    routes.push({
      path: routePath,
      element: (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
          <LazyComp />
        </Suspense>
      ),
    });
  }

  return routes;
}

const childrenRoutes = buildRouteTree(
  Object.entries(modules) as [string, () => Promise<unknown>][],
);

// 🚀 懒加载 Layout 和其他大型组件
const Layout = lazy(() => import('./layout'));
const Login = lazy(() => import('./pages/login'));
const NotFound = lazy(() => import('./pages/error/NotFound'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const RootRedirect = lazy(() => import('./components/RootRedirect'));

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
          <RootRedirect />
        </Suspense>
      ),
    },
    {
      path: '/login',
      element: (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
          <Login />
        </Suspense>
      ),
    },
    {
      path: '/',
      element: (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        </Suspense>
      ),
      children: childrenRoutes,
    },
    {
      path: '*',
      element: (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
          <NotFound />
        </Suspense>
      ),
    },
  ]);
}
