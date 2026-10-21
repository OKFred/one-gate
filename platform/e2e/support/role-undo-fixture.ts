import type { Page } from '@playwright/test';
import { installDeleteUndoFixture, type UndoRequest } from './delete-undo-fixture.js';
import { fulfillOk } from './recycle-bin-fixture.js';

export interface UndoRole {
  id: number;
  name: string;
  isEnabled: boolean;
  updateTimeUtc: number | null;
  remark: string | null;
  dataScope: 'self_only';
  customDeptIds: string | null;
  permissionCount: number;
  createTimeUtc: number;
}

export const undoRole = (id: number, overrides: Partial<UndoRole> = {}): UndoRole => ({
  id,
  name: `Undo role ${id}`,
  isEnabled: true,
  updateTimeUtc: null,
  remark: null,
  dataScope: 'self_only',
  customDeptIds: null,
  permissionCount: 2,
  createTimeUtc: 1_700_000_000_000,
  ...overrides,
});

/** Blocks all API traffic and shares the existing department fixture for mixed-resource tests. */
export async function installRoleUndoFixture(
  page: Page,
  options: {
    roles?: UndoRole[];
    permissions?: string[];
    langCode?: 'en-US' | 'zh-CN';
    includeDepartment?: boolean;
  } = {},
) {
  const permissions = options.permissions ?? [
    'admin.system.role:read',
    'admin.system.role:delete',
    'admin.system.role:edit',
    'admin.system.department:read',
    'admin.system.department:delete',
    'admin.maintenance.recycle_bin:read',
    'admin.maintenance.recycle_bin:restore',
  ];
  const department = await installDeleteUndoFixture(page, {
    permissions,
    departments: options.includeDepartment ? undefined : [],
    langCode: options.langCode,
  });
  const state = {
    department,
    base: department.base,
    roles: options.roles ?? [undoRole(2)],
    deleted: new Map<
      number,
      {
        role: UndoRole;
        receipt: {
          resourceType: 'role';
          id: number;
          expectedDeletedTimeUtc: number;
          undoExpiresTimeUtc: number;
          serverTimeUtc: number;
        };
      }
    >(),
    deleteRequests: [] as { id: number; expectedUpdateTimeUtc: number | null }[],
    listRequests: [] as { keyword?: string; pageNo?: number; pageSize?: number }[],
    getRequests: [] as { id: number }[],
    undoRequests: [] as UndoRequest[],
    restore(id: number) {
      const record = state.deleted.get(id);
      if (!record) throw new Error(`No role fixture deletion exists for ${id}`);
      state.roles.push({ ...record.role, updateTimeUtc: record.receipt.expectedDeletedTimeUtc });
      state.deleted.delete(id);
      return record;
    },
  };
  state.base.resources = [
    {
      resourceType: 'role',
      labelKey: 'businessType.admin.system.role',
      canRestore: true,
      canPurge: false,
    },
  ];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/role/deleteWithUndo')) state.deleteRequests.push(request.postDataJSON());
    if (path.endsWith('/role/list')) state.listRequests.push(request.postDataJSON());
    if (path.endsWith('/role/get')) state.getRequests.push(request.postDataJSON());
    if (path.endsWith('/recycle-bin/undo')) {
      const data = request.postDataJSON() as UndoRequest;
      if (data.resourceType === 'role') state.undoRequests.push(data);
    }
  });
  await page.route('**/api/v1/admin/system/menu/tree', (route) =>
    route.fulfill(
      fulfillOk([
        {
          id: 109,
          name: 'businessType.admin.system.role',
          path: '/admin/system/role',
          children: [],
        },
        { id: 108, name: 'department.title', path: '/admin/system/department', children: [] },
        {
          id: 107,
          name: 'sidebar.menu.maintenance.recycleBin',
          path: '/admin/recycle-bin',
          children: [],
        },
        {
          id: 110,
          name: 'businessType.admin.base.sys_config',
          path: '/admin/base/sys_config',
          children: [],
        },
      ]),
    ),
  );
  await page.route('**/api/v1/admin/data/schema_form/batch_get', (route) =>
    route.fulfill(fulfillOk({ version: 'role-undo-fixture-v1', schemas: {} })),
  );
  await page.route('**/api/v1/admin/system/role/list', (route) => {
    const request = route.request().postDataJSON() as {
      keyword?: string;
      pageNo?: number;
      pageSize?: number;
    };
    const roles = state.roles.filter((role) =>
      role.name.toLowerCase().includes(request.keyword?.toLowerCase() ?? ''),
    );
    const pageNo = request.pageNo ?? 1;
    const pageSize = request.pageSize ?? 10;
    return route.fulfill(
      fulfillOk({
        list: roles.slice((pageNo - 1) * pageSize, pageNo * pageSize),
        total: roles.length,
        pageSize,
        currentPage: pageNo,
        totalPage: Math.ceil(roles.length / pageSize),
      }),
    );
  });
  await page.route('**/api/v1/admin/system/role/get', (route) => {
    const request = route.request().postDataJSON() as { id: number };
    return route.fulfill(fulfillOk(state.roles.find((role) => role.id === request.id) ?? null));
  });
  await page.route('**/api/v1/admin/system/role/deleteWithUndo', (route) => {
    const request = route.request().postDataJSON() as { id: number };
    const role = state.roles.find((record) => record.id === request.id);
    if (!role) throw new Error(`No active role fixture exists for ${request.id}`);
    const now = Math.max(Date.now(), (role.updateTimeUtc ?? 0) + 1);
    const receipt = {
      resourceType: 'role' as const,
      id: role.id,
      expectedDeletedTimeUtc: now,
      undoExpiresTimeUtc: now + 15_000,
      serverTimeUtc: now,
    };
    state.deleted.set(role.id, { role, receipt });
    state.roles = state.roles.filter((record) => record.id !== role.id);
    return route.fulfill(fulfillOk(receipt));
  });
  await page.route('**/api/v1/admin/maintenance/recycle-bin/undo', (route) => {
    const request = route.request().postDataJSON() as UndoRequest;
    if (request.resourceType !== 'role') return route.fallback();
    const record = state.deleted.get(request.id);
    if (!record || record.receipt.expectedDeletedTimeUtc !== request.expectedDeletedTimeUtc)
      throw new Error('Role undo received a stale deletion version');
    state.restore(request.id);
    return route.fulfill(fulfillOk(request.id));
  });
  return state;
}
