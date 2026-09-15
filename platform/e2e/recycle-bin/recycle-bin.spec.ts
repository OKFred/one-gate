import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  deletedDepartment,
  fulfillOk,
  installRecycleBinFixture,
  recycleBinPermissions,
} from '../support/recycle-bin-fixture.js';

test.skip(
  !readE2EEnvironment().mockAuth,
  'Set HODOR_E2E_MOCK_AUTH=true for the isolated recycle bin UI suite.',
);

test('lists deletion details, pages and searches with the fixed department resource', async ({
  page,
}, testInfo) => {
  const fixture = await installRecycleBinFixture(page, {
    rows: Array.from({ length: 12 }, (_, index) => deletedDepartment(index + 1)),
  });
  await page.goto('/#/admin/recycle-bin');
  const table = page.getByRole('table', { name: 'Department Recycle Bin' });
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(table.getByRole('columnheader', { name: 'Deleted by' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Deleted at' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Expires at' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Fixture administrator' })).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('recycle-bin-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(table.getByRole('cell', { name: 'Department 12', exact: true })).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(3);
  await page.getByLabel('Search department name').fill('Department 2');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  expect(fixture.listRequests.at(-1)).toEqual({
    resourceType: 'department',
    keyword: 'Department 2',
    pageNo: 1,
    pageSize: 10,
  });
  expect(fixture.unexpectedRequests).toEqual([]);
});

for (const missing of ['admin.maintenance.recycle_bin:read', 'admin.system.department:read']) {
  test(`does not request deleted records without ${missing}`, async ({ page }) => {
    const fixture = await installRecycleBinFixture(page, {
      permissions: recycleBinPermissions.filter((permission) => permission !== missing),
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(page.getByText('Viewing the recycle bin requires')).toBeVisible();
    expect(fixture.listRequests).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

for (const missing of ['admin.maintenance.recycle_bin:restore', 'admin.system.department:edit']) {
  test(`hides restore without ${missing} and does not trust assignable purge permission`, async ({
    page,
  }) => {
    await installRecycleBinFixture(page, {
      permissions: recycleBinPermissions.filter((permission) => permission !== missing),
      canPurge: false,
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Permanently delete', exact: true })).toHaveCount(
      0,
    );
  });
}

for (const action of ['restore', 'purge'] as const) {
  test(`${action} requires confirmation and sends the selected deletion version`, async ({
    page,
  }) => {
    const row = deletedDepartment(1);
    const fixture = await installRecycleBinFixture(page, { canPurge: true, rows: [row] });
    const requests: unknown[] = [];
    await page.route(`**/api/v1/admin/maintenance/recycle-bin/${action}`, async (route) => {
      requests.push(route.request().postDataJSON());
      fixture.rows = [];
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    await page
      .getByRole('button', {
        name: action === 'restore' ? 'Restore' : 'Permanently delete',
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Department 1');
    if (action === 'purge') await expect(dialog).toContainText('This cannot be undone.');
    expect(requests).toEqual([]);
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toHaveCount(0);
    expect(requests).toEqual([
      { resourceType: 'department', id: row.id, expectedDeletedTimeUtc: row.deletedTimeUtc },
    ]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

for (const failure of [
  { message: 'A department with this name already exists.', status: 409 },
  { message: 'The parent department is deleted.', status: 409 },
  { message: 'The deletion version has changed. Refresh the recycle bin.', status: 409 },
  { message: 'The deletion service is unavailable.', status: 503 },
]) {
  test(`failed restore retains the selected row and reports: ${failure.message}`, async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', (route) =>
      route.fulfill({
        status: failure.status,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: failure.message, data: null }),
      }),
    );
    await page.goto('/#/admin/recycle-bin');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    const previousListRequests = fixture.listRequests.length;
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText(failure.message, { exact: true })).toHaveCount(1);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
    expect(fixture.listRequests).toHaveLength(previousListRequests);
  });
}

test('failed purge leaves its row in the recycle bin', async ({ page }) => {
  await installRecycleBinFixture(page, { canPurge: true });
  await page.route('**/api/v1/admin/maintenance/recycle-bin/purge', (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Child departments must be removed first.' }),
    }),
  );
  await page.goto('/#/admin/recycle-bin');
  await page.getByRole('button', { name: 'Permanently delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByText('Child departments must be removed first.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
});

test('disables expired rows and rechecks the deadline while confirmation stays open', async ({
  page,
}) => {
  const now = Date.now();
  await page.clock.setFixedTime(now);
  await installRecycleBinFixture(page, {
    rows: [
      deletedDepartment(1, { expiresTimeUtc: now + 10_000 }),
      deletedDepartment(2, { expiresTimeUtc: now - 1, canRestore: false }),
    ],
  });
  await page.goto('/#/admin/recycle-bin');
  const expired = page.getByRole('row').filter({ hasText: 'Department 2' });
  await expect(expired.getByRole('button', { name: 'Restore', exact: true })).toBeDisabled();
  await page
    .getByRole('row')
    .filter({ hasText: 'Department 1' })
    .getByRole('button', { name: 'Restore', exact: true })
    .click();
  await page.clock.setFixedTime(now + 10_000);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('Expired, awaiting purge');
});

test('department deletion describes the 30 day recycle bin and keeps the existing request shape', async ({
  page,
}) => {
  await installRecycleBinFixture(page, { langCode: 'zh-CN' });
  let deleted = false;
  const requests: unknown[] = [];
  await page.route('**/api/v1/admin/system/department/listAll', (route) =>
    route.fulfill(
      fulfillOk(deleted ? [] : [{ id: 9, name: '测试部门', parentId: null, isEnabled: true }]),
    ),
  );
  await page.route('**/api/v1/admin/system/department/delete', async (route) => {
    requests.push(route.request().postDataJSON());
    deleted = true;
    await route.fulfill(fulfillOk(1));
  });
  await page.goto('/#/admin/system/department');
  await page.getByRole('button', { name: '删除', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('部门将进入回收站，保留 30 天');
  await expect(dialog).not.toContainText('此操作不可撤销');
  await dialog.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByText('测试部门', { exact: true })).toHaveCount(0);
  expect(requests).toEqual([{ id: 9 }]);
});

test('desktop sidebar can close and reopen without hiding page accessibility', async ({ page }) => {
  await installRecycleBinFixture(page);
  await page.goto('/#/admin/recycle-bin');
  const table = page.getByRole('table', { name: 'Department Recycle Bin' });
  await expect(table).toBeVisible();
  const toggle = page.getByRole('banner').getByRole('button').first();
  await toggle.click();
  await expect(page.getByRole('navigation')).toHaveCSS('width', '0px');
  await expect(table).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('navigation')).toHaveCSS('width', '240px');
  await expect(table).toBeVisible();
});

test('mobile sidebar closes on escape and navigation, returning focus to the recycle bin', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRecycleBinFixture(page, { canPurge: true, langCode: 'zh-CN' });
  await page.goto('/#/admin/recycle-bin');
  const table = page.getByRole('table', { name: '部门回收站' });
  await expect(table).toBeVisible();
  await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('recycle-bin-mobile.png'), fullPage: true });
  await table.getByRole('button', { name: '彻底清除', exact: true }).scrollIntoViewIfNeeded();
  await expect(table.getByRole('button', { name: '恢复', exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('recycle-bin-mobile-actions.png'),
    fullPage: true,
  });
  const toggle = page.getByRole('banner').getByRole('button').first();
  await toggle.click();
  await expect(page.getByRole('button', { name: '回收站', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(table).toBeVisible();
  await toggle.click();
  await page.getByRole('button', { name: '回收站', exact: true }).click();
  await expect(table).toBeVisible();
  await expect(page.locator('#root')).not.toHaveAttribute('aria-hidden', 'true');
});
