import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fulfillOk, installRecycleBinFixture } from './recycle-bin-fixture';

export const assetPermissions = [
  'enterprise.tenant:read',
  'enterprise.tenant:add',
  'enterprise.tenant:edit',
  'enterprise.asset:read',
  'enterprise.asset:add',
  'enterprise.asset:edit',
  'enterprise.asset.mapping:read',
];
export const assetFixtureTime = 1_790_000_000_000;
export function tenantFixture(
  id: number,
  name: string,
  memberRole: 'owner' | 'admin' | 'editor' | 'viewer' = 'owner',
) {
  return {
    id,
    key: `enterprise-${id}`,
    name,
    isEnabled: true,
    memberRole,
    frozen: false,
    creatorId: 42,
    updaterId: null,
    createTimeUtc: assetFixtureTime,
    updateTimeUtc: assetFixtureTime + id,
  };
}
export function assetFixture(tenantId: number, id: number, name: string) {
  return {
    id,
    tenantId,
    assetId: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    assetCode: `CODE-${id}`,
    name,
    category: 'disk',
    brand: 'Fixture',
    model: null,
    remark: null,
    status: 'active',
    retiredTimeUtc: null,
    stateReason: null,
    creatorId: 42,
    updaterId: null,
    createTimeUtc: assetFixtureTime,
    updateTimeUtc: null as number | null,
  };
}
export function pageFixture<T>(list: T[], pageNo = 1, pageSize = 10) {
  return {
    list: list.slice((pageNo - 1) * pageSize, pageNo * pageSize),
    total: list.length,
    currentPage: pageNo,
    pageSize,
    totalPage: Math.ceil(list.length / pageSize),
  };
}

export async function installAssetFixture(
  page: Page,
  options: {
    role?: 'owner' | 'admin' | 'editor' | 'viewer';
    permissions?: string[];
    frozen?: boolean;
    canManagePlatform?: boolean;
    langCode?: 'en-US' | 'zh-CN';
  } = {},
) {
  const base = await installRecycleBinFixture(page, {
    permissions: options.permissions ?? assetPermissions,
    langCode: options.langCode,
  });
  const state = {
    ...base,
    tenants: [
      tenantFixture(11, 'Enterprise A', options.role),
      tenantFixture(22, 'Enterprise B', options.role),
    ],
    assets: [assetFixture(11, 101, 'Disk A'), assetFixture(22, 202, 'Disk B')],
    writes: [] as { path: string; data: Record<string, unknown> }[],
    assetLists: [] as { tenantId: number; keyword?: string }[],
  };
  if (options.frozen) state.tenants[0].frozen = true;
  await page.route('**/api/v1/admin/system/menu/tree', (route) =>
    route.fulfill(
      fulfillOk([
        {
          id: 107,
          name: 'sidebar.menu.enterprise.tenant',
          path: '/enterprise/tenant',
          children: [],
        },
        { id: 108, name: 'sidebar.menu.enterprise.asset', path: '/enterprise/asset', children: [] },
      ]),
    ),
  );
  await page.route('**/api/v1/enterprise/tenant/*', async (route) => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1);
    const data = route.request().postDataJSON() as Record<string, unknown>;
    if (path === 'list' || path === 'platformList')
      return route.fulfill(
        fulfillOk({
          ...pageFixture(state.tenants, Number(data.pageNo ?? 1), Number(data.pageSize ?? 10)),
          canManagePlatform: options.canManagePlatform ?? false,
        }),
      );
    if (path === 'memberList')
      return route.fulfill(
        fulfillOk(
          pageFixture(
            [
              {
                id: 1,
                tenantId: data.tenantId,
                userId: 42,
                username: 'fixture_admin',
                userIsEnabled: true,
                role: 'owner',
                isEnabled: true,
                creatorId: 42,
                updaterId: null,
                createTimeUtc: assetFixtureTime,
                updateTimeUtc: 700,
              },
              {
                id: 2,
                tenantId: data.tenantId,
                userId: 43,
                username: 'second_member',
                userIsEnabled: true,
                role: 'editor',
                isEnabled: true,
                creatorId: 42,
                updaterId: null,
                createTimeUtc: assetFixtureTime,
                updateTimeUtc: 701,
              },
            ],
            Number(data.pageNo ?? 1),
            Number(data.pageSize ?? 20),
          ),
        ),
      );
    if (path === 'tokenGrantList') return route.fulfill(fulfillOk(pageFixture([])));
    state.writes.push({ path: `tenant/${path}`, data });
    return route.fulfill(fulfillOk(1));
  });
  await page.route('**/api/v1/enterprise/asset/**', async (route) => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1);
    const data = route.request().postDataJSON() as Record<string, unknown>;
    if (path === 'list') {
      state.assetLists.push(data as { tenantId: number; keyword?: string });
      return route.fulfill(
        fulfillOk(
          pageFixture(
            state.assets.filter(
              (row) =>
                row.tenantId === data.tenantId &&
                row.name.toLowerCase().includes(String(data.keyword ?? '').toLowerCase()),
            ),
            Number(data.pageNo ?? 1),
            Number(data.pageSize ?? 10),
          ),
        ),
      );
    }
    if (path === 'get')
      return route.fulfill(
        fulfillOk(state.assets.find((row) => row.tenantId === data.tenantId && row.id === data.id)),
      );
    if (path === 'identifierList' || path === 'assignmentList' || path === 'bindingList')
      return route.fulfill(fulfillOk(pageFixture([])));
    if (path === 'resolve') return route.fulfill(fulfillOk({ status: 'unmapped', mapping: null }));
    state.writes.push({ path: `asset/${path}`, data });
    const asset = state.assets.find(
      (row) => row.tenantId === data.tenantId && row.id === (data.assetId ?? data.id),
    );
    if (asset) asset.updateTimeUtc = (asset.updateTimeUtc ?? assetFixtureTime) + 1;
    return route.fulfill(fulfillOk(1));
  });
  return state;
}

export async function openAssets(page: Page, kind: 'asset' | 'tenant' = 'asset') {
  await page.goto(`http://127.0.0.1:4174/#/enterprise/${kind}`);
}

export async function chooseEnterprise(page: Page, name: 'Enterprise A' | 'Enterprise B') {
  await page.getByRole('combobox', { name: 'Enterprise', exact: true }).click();
  await page.getByRole('option', { name: new RegExp(name) }).click();
  await page.getByRole('listbox').waitFor({ state: 'detached' });
}

export async function saveAssetScreenshot(page: Page, name: string) {
  const directory = process.env.HODOR_E2E_ASSET_SCREENSHOT_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}
