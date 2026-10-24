import type { Page } from '@playwright/test';
import type { components } from '../../packages/ui/src/types/openapi.js';
import { fulfillOk, installRecycleBinFixture } from './recycle-bin-fixture.js';

type CreateApiTokenRequest = components['schemas']['admin.system.api_token.add.req'];
type ListApiTokenRequest = components['schemas']['admin.system.api_token.list.req'];
type ApiTokenRow = components['schemas']['admin.system.api_token.list.res']['data']['list'][number];

export const fixtureRawToken = 'hdr_fixture_only_not_a_credential_for_create_reveal';
export const fixtureCreateError = 'Fixture API token creation failed';

/** Reuses the blocked-network auth fixture; all tokens and writes exist only in this browser. */
export async function installApiTokenFixture(
  page: Page,
  options: { failureStatus?: 200 | 503 } = {},
) {
  const base = await installRecycleBinFixture(page, {
    permissions: [
      'admin.system.api_token:read',
      'admin.system.api_token:add',
      'admin.system.api_token:edit',
      'admin.system.api_token:delete',
    ],
    rows: [],
  });
  const state = {
    base,
    rows: [] as ApiTokenRow[],
    createRequests: [] as CreateApiTokenRequest[],
    listRequests: [] as ListApiTokenRequest[],
    writes: [] as { operation: string; data: unknown }[],
  };

  await page.route('**/api/v1/admin/system/menu/tree', (route) =>
    route.fulfill(
      fulfillOk([
        {
          id: 201,
          name: 'sidebar.menu.system.apiToken',
          path: '/admin/system/api-token',
          children: [],
        },
      ]),
    ),
  );
  await page.route('**/api/v1/admin/data/schema_form/batch_get', (route) =>
    route.fulfill(fulfillOk({ version: 'api-token-fixture-v1', schemas: {} })),
  );
  await page.route('**/api/v1/admin/system/permission/listAll', (route) =>
    route.fulfill(
      fulfillOk([{ id: 1, code: 'admin.system.user:read', name: 'Read fixture users' }]),
    ),
  );
  await page.route('**/api/v1/admin/system/api-token/*', async (route) => {
    const operation = new URL(route.request().url()).pathname.split('/').at(-1);
    if (operation === 'list') {
      const request = route.request().postDataJSON() as ListApiTokenRequest;
      state.listRequests.push(request);
      const rows = state.rows.filter((row) =>
        row.name.toLowerCase().includes(request.keyword?.toLowerCase() ?? ''),
      );
      await route.fulfill(
        fulfillOk({
          list: rows.slice(
            (request.pageNo - 1) * request.pageSize,
            request.pageNo * request.pageSize,
          ),
          total: rows.length,
          currentPage: request.pageNo,
          pageSize: request.pageSize,
          totalPage: Math.ceil(rows.length / request.pageSize),
        }),
      );
      return;
    }

    const data: unknown = route.request().postDataJSON();
    state.writes.push({ operation: operation ?? '', data });
    if (operation !== 'add') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Unexpected fixture token write' }),
      });
      return;
    }

    const request = route.request().postDataJSON() as CreateApiTokenRequest;
    state.createRequests.push(request);
    if (options.failureStatus) {
      await route.fulfill({
        status: options.failureStatus,
        contentType: 'application/json',
        // Even a rejected response carrying a token must never reveal it in the UI.
        body: JSON.stringify({
          ok: false,
          data: { id: 201, rawToken: fixtureRawToken },
          message: fixtureCreateError,
        }),
      });
      return;
    }

    const id = 201 + state.rows.length;
    state.rows.push({
      id,
      name: request.name,
      permissions: request.permissions,
      ipWhitelist: request.ipWhitelist ?? null,
      startTimeUtc: request.startTimeUtc ?? null,
      expireTimeUtc: request.expireTimeUtc ?? null,
      remark: request.remark ?? null,
      tokenPrefix: fixtureRawToken.slice(0, 12),
      lastUsedTimeUtc: null,
      status: 'active',
      creatorId: 42,
      updaterId: null,
      createTimeUtc: 1_790_000_000_000,
      updateTimeUtc: null,
    });
    const response = {
      ok: true,
      data: { id, rawToken: fixtureRawToken },
      message: 'ok',
    } satisfies components['schemas']['admin.system.api_token.add.res'];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
  });
  return state;
}
