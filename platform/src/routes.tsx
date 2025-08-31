import { useRoutes } from 'react-router-dom';

// 动态递归导入 pages 下除 error、layout、login 的页面
const modules = import.meta.glob('./pages/!(error|layout|login)/**/index.tsx', { eager: true });
import type { ReactElement, ComponentType } from 'react';

type RouteItem = { path: string; element: ReactElement; children?: RouteItem[] };

// 递归构建路由树
function buildRouteTree(paths: [string, any][]): RouteItem[] {
  const tree: Record<string, RouteItem> = {};
  for (const [filePath, mod] of paths) {
    // ./pages/mail/template/index.tsx => mail/template
    const match = filePath.match(/\.\/pages\/(.*?)\/index\.tsx$/);
    if (!match) continue;
    const routePath = match[1];
    const segments = routePath.split('/');
    let cur = tree;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!cur[seg]) {
        cur[seg] = {
          path: seg,
          element: null,
          children: {},
        };
      }
      if (i === segments.length - 1) {
        const Comp = (mod as { default: ComponentType<Record<string, unknown>> }).default;
        cur[seg].element = <Comp />;
      }
      cur = cur[seg].children;
    }
  }
  // 转换为数组并递归 children
  function toArray(obj: Record<string, RouteItem>): RouteItem[] {
    return Object.values(obj).map(({ path, element, children }) => ({
      path,
      element,
      children: children && Object.keys(children).length > 0 ? toArray(children) : undefined,
    }));
  }
  return toArray(tree);
}

const childrenRoutes = buildRouteTree(Object.entries(modules));

import Login from './pages/login';
import Home from './pages/home';
import NotFound from './pages/error/NotFound';
import Layout from './pages/layout';

export default function AppRoutes() {
  return useRoutes([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    {
      path: '/',
      element: <Layout />,
      children: childrenRoutes,
    },
    { path: '*', element: <NotFound /> },
  ]);
}
