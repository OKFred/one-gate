import { useRoutes } from 'react-router-dom';
import { lazy, Suspense, type ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import RootRedirect from '@/components/RootRedirect';

const modules = import.meta.glob('./pages/**/index.tsx');
export const loginPath = '/login';
export const homePath = '/home';

const PageLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <CircularProgress />
  </div>
);

function buildRouteTree(paths: [string, () => Promise<unknown>][]): RouteObject[] {
  const routes: RouteObject[] = [];

  for (const [filePath, loader] of paths) {
    // ./pages/mail/template/index.tsx => mail/template
    const match = filePath.match(/\.\/pages\/(.*?)\/index\.tsx$/);
    if (!match) continue;

    const routePath = match[1];
    const LazyComp = lazy(() =>
      loader().then((mod) => ({
        default: (mod as { default: ComponentType<Record<string, unknown>> }).default,
      })),
    );

    routes.push({
      path: routePath,
      element: (
        <Suspense fallback={<PageLoading />}>
          <LazyComp />
        </Suspense>
      ),
    });
  }

  return routes;
}

const childrenRoutes = [
  ...buildRouteTree(
    (Object.entries(modules) as [string, () => Promise<unknown>][]).filter(
      ([filePath]) =>
        !filePath.startsWith('./pages/error/') && !filePath.startsWith('./pages/login/'),
    ),
  ),
  {
    path: 'organization/*',
    element: <div />,
  },
  {
    path: 'executive/*',
    element: <div />,
  },
  {
    path: 'personal/*',
    element: <div />,
  },
];

const Layout = lazy(() => import('@/layout'));
const Login = lazy(() => import('./pages/login'));
const NotFound = lazy(() => import('@/components/NotFound'));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute'));

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <RootRedirect />,
    },
    {
      path: '/login',
      element: (
        <Suspense fallback={<PageLoading />}>
          <Login />
        </Suspense>
      ),
    },
    {
      path: '/',
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
        <Suspense fallback={<PageLoading />}>
          <NotFound />
        </Suspense>
      ),
    },
  ]);
}
