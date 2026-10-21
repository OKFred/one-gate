import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';
import {
  fulfillOk,
  openRecycleBinAccountWindow,
  recycleBinFixtureUser,
} from '../support/recycle-bin-fixture';
import {
  assetFixture,
  assetPermissions,
  chooseEnterprise,
  installAssetFixture,
  openAssets,
  pageFixture,
  saveAssetScreenshot,
} from '../support/enterprise-assets-fixture';

test.use({ storageState: { cookies: [], origins: [] } });

test('enterprise selection isolates ledgers and asset edits use their exact version', async ({
  page,
}) => {
  const state = await installAssetFixture(page);
  await openAssets(page);
  await expect(page.getByText('Choose an enterprise to view its assets.')).toBeVisible();
  expect(state.assetLists).toHaveLength(0);
  await chooseEnterprise(page, 'Enterprise A');
  await expect(page.getByRole('button', { name: 'Disk A', exact: true })).toBeVisible();
  await expect(page.getByText('Disk B', { exact: true })).toHaveCount(0);
  await saveAssetScreenshot(page, 'ui-asset-ledger');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit', exact: true });
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Renamed disk');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]).toMatchObject({
    path: 'asset/update',
    data: { tenantId: 11, id: 101, expectedUpdateTimeUtc: null, name: 'Renamed disk' },
  });
  await chooseEnterprise(page, 'Enterprise B');
  await expect(page.getByRole('button', { name: 'Disk B', exact: true })).toBeVisible();
  await expect(page.getByText('Disk A', { exact: true })).toHaveCount(0);
  expect(state.writes.every((row) => !row.path.includes('delete'))).toBe(true);
  expect(state.unexpectedRequests).toEqual([]);
  await page.getByRole('button', { name: 'Enterprises & Members', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enterprise A', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Asset Register', exact: true }).click();
  await expect(page.getByText('Choose an enterprise to view its assets.')).toBeVisible();
});

test('late A response cannot overwrite a newer A after A to B to A', async ({ page }) => {
  await installAssetFixture(page);
  let delayed: Route | undefined;
  let aRequests = 0;
  await page.route('**/api/v1/enterprise/asset/list', async (route) => {
    const data = route.request().postDataJSON() as { tenantId: number };
    if (data.tenantId === 11 && ++aRequests === 1) {
      delayed = route;
      return;
    }
    return route.fulfill(
      fulfillOk(
        pageFixture([
          assetFixture(
            data.tenantId,
            data.tenantId === 11 ? 101 : 202,
            data.tenantId === 11 ? 'New A result' : 'Disk B',
          ),
        ]),
      ),
    );
  });
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await expect.poll(() => Boolean(delayed)).toBe(true);
  await chooseEnterprise(page, 'Enterprise B');
  await expect(page.getByRole('button', { name: 'Disk B', exact: true })).toBeVisible();
  await chooseEnterprise(page, 'Enterprise A');
  await expect(page.getByRole('button', { name: 'New A result', exact: true })).toBeVisible();
  await delayed?.fulfill(fulfillOk(pageFixture([assetFixture(11, 101, 'Stale A result')])));
  await expect(page.getByRole('button', { name: 'New A result', exact: true })).toBeVisible();
  await expect(page.getByText('Stale A result')).toHaveCount(0);
});

test('viewer and frozen enterprises do not expose asset mutations', async ({ page }) => {
  const state = await installAssetFixture(page, { role: 'viewer', frozen: true });
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await expect(page.getByText(/Normal access is frozen/)).toBeVisible();
  expect(state.assetLists).toHaveLength(0);
  await chooseEnterprise(page, 'Enterprise B');
  await expect(page.getByRole('button', { name: 'Disk B', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register asset', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retire', exact: true })).toHaveCount(0);
});

test('global permission and enterprise role both constrain writes', async ({ page }) => {
  await installAssetFixture(page, {
    permissions: assetPermissions.filter(
      (code) => !code.endsWith(':add') && !code.endsWith(':edit'),
    ),
  });
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await expect(page.getByRole('button', { name: 'Disk A', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Register asset', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retire', exact: true })).toHaveCount(0);
});

test('successful retirement keeps its success when list refresh fails', async ({ page }) => {
  const state = await installAssetFixture(page);
  await page.route('**/api/v1/enterprise/asset/list', (route) =>
    state.writes.length ? route.fulfill({ status: 503, ...fulfillOk(null) }) : route.fallback(),
  );
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await page.getByRole('button', { name: 'Retire', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Retire', exact: true });
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Hardware replaced');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText('The operation succeeded, but the list could not be refreshed.'),
  ).toBeVisible();
  expect(state.writes).toEqual([
    {
      path: 'asset/retire',
      data: { tenantId: 11, id: 101, expectedUpdateTimeUtc: null, reason: 'Hardware replaced' },
    },
  ]);
});

test('business rejection is shown once and leaves the confirmation available for correction', async ({
  page,
}) => {
  await installAssetFixture(page);
  await page.route('**/api/v1/enterprise/asset/retire', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        message: 'Fixture version conflict',
        code: 'ASSET_STATE_CONFLICT',
      }),
    }),
  );
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await page.getByRole('button', { name: 'Retire', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Retire', exact: true });
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Replace');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Fixture version conflict', { exact: true })).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('identity switching clears old confirmation and rejects its delayed success', async ({
  page,
}) => {
  const state = await installAssetFixture(page);
  let pending: Route | undefined;
  await page.route('**/api/v1/enterprise/asset/retire', (route) => {
    pending = route;
  });
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await page.getByRole('button', { name: 'Retire', exact: true }).click();
  await page.getByRole('textbox', { name: 'Reason' }).fill('Retire');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => Boolean(pending)).toBe(true);
  const account = await openRecycleBinAccountWindow(page);
  await account.evaluate((user) => localStorage.setItem('userInfo', JSON.stringify(user)), {
    ...recycleBinFixtureUser,
    id: 99,
    token: 'another-user-token',
  });
  await expect(page.getByRole('dialog', { name: 'Retire', exact: true })).toHaveCount(0);
  await pending?.fulfill(fulfillOk(101));
  await expect(page.getByText('Saved successfully', { exact: true })).toHaveCount(0);
  expect(state.writes).toHaveLength(0);
  await account.close();
});

test('identifier evidence, measurement migration and historical resolver are available in details', async ({
  page,
}) => {
  const state = await installAssetFixture(page);
  await page.route('**/api/v1/enterprise/asset/bindingList', (route) =>
    route.fulfill(
      fulfillOk(
        pageFixture([
          {
            id: 901,
            tenantId: 11,
            assetId: 101,
            sourceSystem: 'prometheus',
            collectorId: 'host-a',
            deviceId: 'sda',
            metric: 'temperature',
            channel: '',
            validFromUtc: 1000,
            validToUtc: null,
            reason: 'Installed',
            closeReason: null,
            creatorId: 42,
            updaterId: null,
            createTimeUtc: 1000,
            updateTimeUtc: 800,
          },
        ]),
      ),
    ),
  );
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await page.getByRole('button', { name: 'Disk A', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Asset details · Disk A', exact: true });
  await expect(details.getByText(/00000000-0000-4000-8000-000000000101/)).toBeVisible();
  await saveAssetScreenshot(page, 'ui-asset-details');
  await details.getByRole('tab', { name: 'Hardware identifiers' }).click();
  await expect(details.getByText(/SN is optional/)).toBeVisible();
  await details.getByRole('button', { name: 'Add identifier', exact: true }).click();
  const identifier = page.getByRole('dialog', { name: 'Add identifier', exact: true });
  await identifier.getByRole('textbox', { name: 'Original value' }).fill('SN-0001');
  await identifier.getByRole('textbox', { name: 'Evidence source' }).fill('Physical label');
  await identifier.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(identifier).toHaveCount(0);
  expect(state.writes[0]).toMatchObject({
    path: 'asset/identifierAdd',
    data: {
      tenantId: 11,
      assetId: 101,
      expectedAssetUpdateTimeUtc: null,
      identifierType: 'sn',
      value: 'SN-0001',
      source: 'Physical label',
      isVerified: false,
    },
  });
  await details.getByRole('tab', { name: 'Measurement bindings' }).click();
  await details.getByRole('button', { name: 'Move / replace relationship' }).click();
  const migration = page.getByRole('dialog', { name: 'Move / replace relationship', exact: true });
  await migration.getByRole('textbox', { name: 'Collector ID', exact: true }).fill('host-b');
  await migration.getByRole('textbox', { name: 'Reason' }).fill('Moved disk to host B');
  await migration.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(migration).toHaveCount(0);
  expect(state.writes[1]).toMatchObject({
    path: 'asset/bind',
    data: {
      tenantId: 11,
      assetId: 101,
      expectedAssetUpdateTimeUtc: 1_790_000_000_001,
      replacesId: 901,
      expectedUpdateTimeUtc: 800,
      collectorId: 'host-b',
    },
  });
  await details.getByRole('tab', { name: 'Resolve an observation' }).click();
  await details.getByRole('textbox', { name: 'Source system' }).fill('prometheus');
  await details.getByRole('textbox', { name: 'Collector ID', exact: true }).fill('host-a');
  await details.getByRole('textbox', { name: 'Device ID' }).fill('sda');
  await details.getByRole('textbox', { name: 'Metric', exact: true }).fill('temperature');
  await details.getByRole('button', { name: 'Resolve an observation' }).click();
  await expect(details.getByText('No mapping at this observation time.')).toBeVisible();
});

test('platform capability exposes enterprise creation, versioned edits and audited owner recovery', async ({
  page,
}) => {
  const state = await installAssetFixture(page, { canManagePlatform: true });
  await openAssets(page, 'tenant');
  await page.getByRole('button', { name: 'Platform management', exact: true }).click();
  await page.getByRole('button', { name: 'Create enterprise', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Create enterprise', exact: true });
  await create.getByRole('textbox', { name: 'Enterprise key' }).fill('new-company');
  await create.getByRole('textbox', { name: 'Name', exact: true }).fill('New company');
  await create.getByRole('spinbutton', { name: 'Owner user ID' }).fill('60');
  await create.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(create).toHaveCount(0);
  expect(state.writes[0]).toEqual({
    path: 'tenant/create',
    data: { key: 'new-company', name: 'New company', ownerUserId: 60 },
  });
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  const edit = page.getByRole('dialog', { name: 'Edit', exact: true });
  await edit.getByRole('textbox', { name: 'Name', exact: true }).fill('Renamed enterprise');
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(edit).toHaveCount(0);
  expect(state.writes[1]).toEqual({
    path: 'tenant/update',
    data: {
      tenantId: 11,
      name: 'Renamed enterprise',
      isEnabled: true,
      expectedUpdateTimeUtc: 1_790_000_000_011,
    },
  });
  await page.getByRole('button', { name: 'Recover owner', exact: true }).first().click();
  const recovery = page.getByRole('dialog', { name: 'Recover owner', exact: true });
  await recovery.getByRole('spinbutton', { name: 'Owner user ID' }).fill('61');
  await recovery
    .getByRole('textbox', { name: 'Reason' })
    .fill('Original owner account unavailable');
  await recovery.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(recovery).toHaveCount(0);
  expect(state.writes[2]).toEqual({
    path: 'tenant/recoverOwner',
    data: {
      tenantId: 11,
      userId: 61,
      expectedUpdateTimeUtc: 1_790_000_000_011,
      reason: 'Original owner account unavailable',
    },
  });
  await page.getByRole('button', { name: 'My enterprises', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Recover owner', exact: true })).toHaveCount(0);
});

test('member and machine grants are tied to the selected enterprise without entering token secrets', async ({
  page,
}) => {
  const state = await installAssetFixture(page);
  await openAssets(page, 'tenant');
  await page.getByRole('button', { name: 'Enterprise A', exact: true }).click();
  await page.getByRole('button', { name: 'Add member', exact: true }).click();
  const member = page.getByRole('dialog', { name: 'Members', exact: true });
  await member.getByRole('spinbutton', { name: 'Existing user ID' }).fill('60');
  await member.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(member).toHaveCount(0);
  expect(state.writes[0]).toEqual({
    path: 'tenant/memberSet',
    data: {
      tenantId: 11,
      userId: 60,
      role: 'viewer',
      isEnabled: true,
      expectedUpdateTimeUtc: null,
    },
  });
  await page.getByRole('button', { name: 'Grant mapping access', exact: true }).click();
  const grant = page.getByRole('dialog', { name: 'Machine read grants', exact: true });
  await expect(grant.getByRole('textbox')).toHaveCount(0);
  await grant.getByRole('spinbutton', { name: 'API Token ID' }).fill('30');
  await grant.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(grant).toHaveCount(0);
  expect(state.writes[1]).toEqual({
    path: 'tenant/tokenGrantSet',
    data: { tenantId: 11, tokenId: 30, isEnabled: true, expectedUpdateTimeUtc: null },
  });
});

test('asset registration explicitly scopes editable fields to the selected enterprise', async ({
  page,
}) => {
  const state = await installAssetFixture(page);
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise B');
  await page.getByRole('button', { name: 'Register asset', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Register asset', exact: true });
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('New hardware');
  await dialog.getByRole('textbox', { name: 'Asset code', exact: true }).fill('NEW-001');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]).toEqual({
    path: 'asset/add',
    data: {
      tenantId: 22,
      name: 'New hardware',
      category: 'other',
      assetCode: 'NEW-001',
      brand: null,
      model: null,
      remark: null,
    },
  });
});

test('platform recovery visibility is provided by the backend, not user role IDs', async ({
  page,
}) => {
  await installAssetFixture(page);
  await openAssets(page, 'tenant');
  await expect(page.getByRole('button', { name: 'Enterprise A', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Platform management', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Recover owner', exact: true })).toHaveCount(0);
  await saveAssetScreenshot(page, 'ui-enterprise-management');
});

for (const outcome of ['business', 'http', 'network'] as const) {
  test(`obsolete enterprise ${outcome} error does not pollute the current ledger`, async ({
    page,
  }) => {
    await installAssetFixture(page);
    let delayed: Route | undefined;
    await page.route('**/api/v1/enterprise/asset/list', (route) => {
      const data = route.request().postDataJSON() as { tenantId: number };
      if (data.tenantId === 11) {
        delayed = route;
        return;
      }
      return route.fallback();
    });
    await openAssets(page);
    await chooseEnterprise(page, 'Enterprise A');
    await expect.poll(() => Boolean(delayed)).toBe(true);
    await chooseEnterprise(page, 'Enterprise B');
    await expect(page.getByRole('button', { name: 'Disk B', exact: true })).toBeVisible();
    const received = page
      .waitForEvent(
        'requestfinished',
        (request) =>
          request.url().endsWith('/enterprise/asset/list') &&
          request.postDataJSON().tenantId === 11,
      )
      .catch(() => undefined);
    if (outcome === 'network') await delayed?.abort('failed');
    else
      await delayed?.fulfill({
        status: outcome === 'http' ? 409 : 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          message: 'Obsolete enterprise error',
          data: { code: 'enterprise.asset.conflict' },
        }),
      });
    if (outcome !== 'network') await received;
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.getByText('Obsolete enterprise error', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Disk B', exact: true })).toBeVisible();
  });
}

test('superseded manual refresh is not reported as a failed operation', async ({ page }) => {
  await installAssetFixture(page);
  let requests = 0;
  let delayed: Route | undefined;
  await page.route('**/api/v1/enterprise/asset/list', (route) => {
    requests += 1;
    if (requests === 2) {
      delayed = route;
      return;
    }
    return route.fulfill(
      fulfillOk(pageFixture([assetFixture(11, 101, requests > 2 ? 'Fresh disk' : 'Disk A')])),
    );
  });
  await openAssets(page);
  await chooseEnterprise(page, 'Enterprise A');
  await expect(page.getByRole('button', { name: 'Disk A', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh', exact: true }).last().click();
  await expect.poll(() => Boolean(delayed)).toBe(true);
  await page.getByRole('button', { name: 'Refresh', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Fresh disk', exact: true })).toBeVisible();
  await delayed?.fulfill(fulfillOk(pageFixture([assetFixture(11, 101, 'Stale disk')])));
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.getByRole('button', { name: 'Fresh disk', exact: true })).toBeVisible();
  await expect(
    page.getByText('The operation succeeded, but the list could not be refreshed.'),
  ).toHaveCount(0);
});

test('owner transfer loads eligible members across pagination and submits both versions', async ({
  page,
}) => {
  const state = await installAssetFixture(page);
  await page.route('**/api/v1/enterprise/tenant/memberList', (route) => {
    const data = route.request().postDataJSON() as { pageSize: number };
    const rows = Array.from({ length: 22 }, (_, index) => ({
      id: index + 1,
      tenantId: 11,
      userId: index === 21 ? 42 : index + 100,
      username: index === 21 ? 'fixture_admin' : `Member ${index}`,
      userIsEnabled: true,
      role: index === 21 ? 'owner' : 'editor',
      isEnabled: true,
      creatorId: 42,
      updaterId: null,
      createTimeUtc: 1000,
      updateTimeUtc: 700 + index,
    }));
    return route.fulfill(fulfillOk(pageFixture(rows, 1, data.pageSize)));
  });
  await openAssets(page, 'tenant');
  await page.getByRole('button', { name: 'Enterprise A', exact: true }).click();
  await page.getByRole('button', { name: 'Transfer ownership', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Transfer ownership', exact: true });
  await dialog.getByRole('combobox', { name: 'New owner' }).click();
  await page.getByRole('option', { name: 'Member 20 (#120)', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes[0]).toEqual({
    path: 'tenant/transferOwner',
    data: { tenantId: 11, toUserId: 120, expectedSourceTimeUtc: 721, expectedTargetTimeUtc: 720 },
  });
});

test('Chinese asset register uses local enterprise translations and supports keyboard dialogs', async ({
  page,
}) => {
  await installAssetFixture(page, { langCode: 'zh-CN' });
  await openAssets(page);
  await expect(page.getByText('资产台账', { exact: true }).first()).toBeVisible();
  await page.getByRole('combobox', { name: '企业', exact: true }).click();
  await page.getByRole('option', { name: /Enterprise A/ }).click();
  await page.getByRole('button', { name: '登记资产', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '登记资产', exact: true });
  await expect(dialog.getByRole('textbox', { name: '名称', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
