import type { Page } from '@playwright/test';

export const recycleBinPermissions = [
  'admin.maintenance.recycle_bin:read',
  'admin.maintenance.recycle_bin:restore',
  'admin.maintenance.recycle_bin:purge',
  'admin.system.department:read',
  'admin.system.department:edit',
  'admin.system.department:delete',
];

export interface DeletedDepartment {
  resourceType: 'department';
  id: number;
  name: string;
  deleterId: number | null;
  deleterName: string | null;
  deletedTimeUtc: number;
  expiresTimeUtc: number;
  canRestore: boolean;
}

export function deletedDepartment(
  id: number,
  overrides: Partial<DeletedDepartment> = {},
): DeletedDepartment {
  const deletedTimeUtc = Date.now() - 24 * 60 * 60 * 1000;
  return {
    resourceType: 'department',
    id,
    name: `Department ${id}`,
    deleterId: 42,
    deleterName: 'Fixture administrator',
    deletedTimeUtc,
    expiresTimeUtc: deletedTimeUtc + 30 * 24 * 60 * 60 * 1000,
    canRestore: true,
    ...overrides,
  };
}

export const fulfillOk = (data: unknown) => ({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, data, message: 'ok' }),
});

export async function installRecycleBinFixture(
  page: Page,
  options: {
    canPurge?: boolean;
    permissions?: string[];
    rows?: DeletedDepartment[];
    langCode?: 'en-US' | 'zh-CN';
  } = {},
) {
  const state = {
    rows: options.rows ?? [deletedDepartment(1)],
    listRequests: [] as unknown[],
    unexpectedRequests: [] as string[],
  };
  await page.addInitScript((langCode) => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({ id: 42, username: 'fixture_admin', token: 'mock-token', langCode }),
    );
    sessionStorage.setItem('chunk_reload_attempted', '1');
  }, options.langCode ?? 'en-US');
  await page.route(/\/(enterprise|personal)\/remoteEntry\.js$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export const init = () => {}; export const get = async () => () => ({ default: () => null });',
    }),
  );
  // Never allow a fixture test to contact the configured live API.
  await page.route('**/api/**', async (route) => {
    state.unexpectedRequests.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Unexpected fixture API request' }),
    });
  });
  await page.route('**/api/v1/admin/i18n/translation/listAll', (route) =>
    route.fulfill(fulfillOk([])),
  );
  await page.route('**/api/v1/admin/system/auth/gate/status', (route) =>
    route.fulfill(fulfillOk({ verified: true, expiresAtUtc: null })),
  );
  await page.route('**/api/v1/admin/system/auth/check', (route) => route.fulfill(fulfillOk(true)));
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', (route) =>
    route.fulfill(
      fulfillOk({
        permissions: (options.permissions ?? recycleBinPermissions).map((code, index) => ({
          id: index + 1,
          code,
          isEnabled: true,
        })),
      }),
    ),
  );
  await page.route('**/api/v1/admin/system/menu/tree', (route) =>
    route.fulfill(
      fulfillOk([
        {
          id: 107,
          name: 'sidebar.menu.maintenance.recycleBin',
          path: '/admin/recycle-bin',
          children: [],
        },
        {
          id: 108,
          name: 'department.title',
          path: '/admin/system/department',
          children: [],
        },
      ]),
    ),
  );
  await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
    const request = route.request().postDataJSON() as {
      keyword?: string;
      pageNo?: number;
      pageSize?: number;
    };
    state.listRequests.push(request);
    const pageNo = request.pageNo ?? 1;
    const pageSize = request.pageSize ?? 10;
    const filtered = state.rows.filter((row) =>
      row.name.toLowerCase().includes(request.keyword?.toLowerCase() ?? ''),
    );
    await route.fulfill(
      fulfillOk({
        list: filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize),
        total: filtered.length,
        totalPage: Math.ceil(filtered.length / pageSize),
        currentPage: pageNo,
        pageSize,
        canPurge: options.canPurge ?? false,
      }),
    );
  });
  return state;
}
