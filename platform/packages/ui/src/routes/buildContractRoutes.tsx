import { createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { contractManifest } from '@hodor/contracts/manifest';
import type { AppScope } from '@hodor/contracts/types';
import { ContractRoutePage } from './ContractRoutePage';

/**
 * 从 @hodor/contracts/manifest 自动装配声明式 CRUD 路由。
 * 若物理目录下已存在 `./pages/.../index.tsx`（含扩展页），优先保留物理路由以免冲突。
 */
export function buildContractRoutes(
  app: AppScope,
  existingRoutes: readonly RouteObject[],
): RouteObject[] {
  const existingPaths = new Set(
    existingRoutes.map((r) => r.path).filter((p): p is string => typeof p === 'string'),
  );
  const routes: RouteObject[] = [];

  for (const entry of contractManifest) {
    if (entry.app !== app || !entry.mountRoute) continue;

    const finalPath = entry.route.startsWith(`${app}/`) ? entry.route : `${app}/${entry.route}`;
    if (existingPaths.has(finalPath)) continue;

    routes.push({
      path: finalPath,
      element: createElement(ContractRoutePage, { load: entry.load }),
    });
  }

  return routes;
}
