import { lazy, Suspense, type ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import RootRedirect from '@/components/RootRedirect';

const modules = import.meta.glob('./pages/**/index.tsx');
export const loginPath = '/login';
export const homePath = '/home';

const renderPageLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <CircularProgress />
  </div>
);

function buildRouteTree(paths: [string, () => Promise<unknown>][]): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const [filePath, loader] of paths) {
    const match = filePath.match(/\.\/pages\/(.*?)\/index\.tsx$/);
    if (!match) continue;

    const routePath = match[1];
    const LazyComp = lazy(() =>
      loader().then((mod) => ({
        default: (mod as { default: ComponentType<Record<string, unknown>> }).default,
      })),
    );

    const element = (
      <Suspense fallback={renderPageLoading()}>
        <LazyComp />
      </Suspense>
    );

    routes.push({
      path: routePath.startsWith('personal/') ? routePath : `personal/${routePath}`,
      element,
    });
  }

  return routes;
}

export const childrenRoutes: RouteObject[] = [
  {
    index: true,
    element: <RootRedirect />,
  },
  ...buildRouteTree(
    (Object.entries(modules) as [string, () => Promise<unknown>][]).filter(
      ([filePath]) =>
        !filePath.startsWith('./pages/error/') && !filePath.startsWith('./pages/login/'),
    ),
  ),
];

const Layout = lazy(() => import('@/layout'));
const NotFound = lazy(() => import('@/components/NotFound'));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute'));

export const routes: RouteObject[] = [
  {
    path: '/*',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: childrenRoutes,
  },
  {
    path: '*',
    element: (
      <Suspense fallback={renderPageLoading()}>
        <NotFound />
      </Suspense>
    ),
  },
];
