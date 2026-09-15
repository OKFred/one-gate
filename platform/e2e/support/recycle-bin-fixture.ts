import type { Page } from '@playwright/test';

export const recycleBinPermissions = [
  'admin.maintenance.recycle_bin:read',
  'admin.maintenance.recycle_bin:restore',
  'admin.maintenance.recycle_bin:purge',
  'admin.system.department:read',
  'admin.system.department:edit',
  'admin.system.department:delete',
];

export interface RecycleBinResource {
  resourceType: string;
  labelKey: string;
  canRestore: boolean;
  canPurge: boolean;
}

export interface DeletedRecord {
  resourceType: string;
  id: number | string;
  name: string;
  deleterId: number | null;
  deleterName: string | null;
  deletedTimeUtc: number;
  expiresTimeUtc: number;
  canRestore: boolean;
}

export function deletedRecord(
  resourceType: string,
  id: number | string,
  overrides: Partial<DeletedRecord> = {},
): DeletedRecord {
  const deletedTimeUtc = Date.now() - 24 * 60 * 60 * 1000;
  return {
    resourceType,
    id,
    name: `Record ${id}`,
    deleterId: 42,
    deleterName: 'Fixture administrator',
    deletedTimeUtc,
    expiresTimeUtc: deletedTimeUtc + 30 * 24 * 60 * 60 * 1000,
    canRestore: true,
    ...overrides,
  };
}

export function deletedDepartment(id: number, overrides: Partial<DeletedRecord> = {}) {
  return deletedRecord('department', id, { name: `Department ${id}`, ...overrides });
}

export const departmentResource: RecycleBinResource = {
  resourceType: 'department',
  labelKey: 'businessType.admin.system.department',
  canRestore: true,
  canPurge: false,
};

/** Only registered by isolated UI tests; no corresponding production business exists. */
export const reportResource: RecycleBinResource = {
  resourceType: 'fixture-report',
  labelKey: 'fixture.recycleBin.report',
  canRestore: true,
  canPurge: true,
};

export const fulfillOk = (data: unknown) => ({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, data, message: 'ok' }),
});

export async function installRecycleBinFixture(
  page: Page,
  options: {
    canPurge?: boolean;
    permissions?: string[];
    rows?: DeletedRecord[];
    resources?: RecycleBinResource[];
    langCode?: 'en-US' | 'zh-CN';
    serverTimeUtc?: number;
  } = {},
) {
  const grantedPermissions = options.permissions ?? recycleBinPermissions;
  const departmentReadable = grantedPermissions.includes('admin.system.department:read');
  const state = {
    serverTimeUtc: options.serverTimeUtc ?? Date.now(),
    rows: options.rows ?? [deletedDepartment(1)],
    resources:
      options.resources ??
      (departmentReadable
        ? [
            {
              ...departmentResource,
              canRestore:
                grantedPermissions.includes('admin.maintenance.recycle_bin:restore') &&
                grantedPermissions.includes('admin.system.department:edit'),
              canPurge: options.canPurge ?? false,
            },
          ]
        : []),
    resourcesRequests: [] as unknown[],
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
    route.fulfill(
      fulfillOk([
        { langCode: 'en-US', tKey: reportResource.labelKey, tValue: 'Reports' },
        { langCode: 'zh-CN', tKey: reportResource.labelKey, tValue: '报告' },
      ]),
    ),
  );
  await page.route('**/api/v1/admin/system/auth/gate/status', (route) =>
    route.fulfill(fulfillOk({ verified: true, expiresAtUtc: null })),
  );
  await page.route('**/api/v1/admin/system/auth/check', (route) => route.fulfill(fulfillOk(true)));
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', (route) =>
    route.fulfill(
      fulfillOk({
        permissions: grantedPermissions.map((code, index) => ({
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
  await page.route('**/api/v1/admin/maintenance/recycle-bin/resources', async (route) => {
    state.resourcesRequests.push(route.request().postDataJSON());
    await route.fulfill(fulfillOk({ list: state.resources }));
  });
  await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
    const request = route.request().postDataJSON() as {
      resourceType: string;
      keyword?: string;
      pageNo?: number;
      pageSize?: number;
    };
    state.listRequests.push(request);
    const pageNo = request.pageNo ?? 1;
    const pageSize = request.pageSize ?? 10;
    const resource = state.resources.find((item) => item.resourceType === request.resourceType);
    const filtered = state.rows.filter(
      (row) =>
        row.resourceType === request.resourceType &&
        row.name.toLowerCase().includes(request.keyword?.toLowerCase() ?? ''),
    );
    await route.fulfill(
      fulfillOk({
        serverTimeUtc: state.serverTimeUtc,
        list: filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize).map((row) => ({
          ...row,
          canRestore: row.canRestore && row.expiresTimeUtc > state.serverTimeUtc,
        })),
        total: filtered.length,
        totalPage: Math.ceil(filtered.length / pageSize),
        currentPage: pageNo,
        pageSize,
        canRestore: resource?.canRestore ?? false,
        canPurge: resource?.canPurge ?? false,
      }),
    );
  });
  return state;
}
