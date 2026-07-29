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
    // ./pages/mail/template/index.tsx => mail/template
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

    // 在微前端 Host 环境中以 /enterprise/xxx 访问
    routes.push({
      path: routePath.startsWith('enterprise/') ? routePath : `enterprise/${routePath}`,
      element,
    });
  }

  return routes;
}

export const childrenRoutes = buildRouteTree(
  (Object.entries(modules) as [string, () => Promise<unknown>][]).filter(
    ([filePath]) =>
      !filePath.startsWith('./pages/error/') && !filePath.startsWith('./pages/login/'),
  ),
);

childrenRoutes.push({
  path: 'biz/enterprise/fullscreen-test',
  element: (
    <div
      style={{
        padding: 40,
        background: '#1e1e1e',
        minHeight: '100vh',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <h1>Fullscreen Custom View (SPA Page)</h1>
      <p>This page has hidden both the Sidebar and the Topbar via route handle metadata.</p>
      <div>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '12px 24px',
            background: '#3f51b5',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ← Go Back
        </button>
      </div>
    </div>
  ),
  handle: {
    hideSidebar: true,
    hideTopbar: true,
  },
});

const Layout = lazy(() => import('@/layout'));
const NotFound = lazy(() => import('@/components/NotFound'));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootRedirect />,
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
      <Suspense fallback={renderPageLoading()}>
        <NotFound />
      </Suspense>
    ),
  },
];
