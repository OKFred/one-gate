import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  deletedDepartment,
  deletedRecord,
  departmentResource,
  fulfillOk,
  installRecycleBinFixture,
  recycleBinPermissions,
  reportResource,
} from '../support/recycle-bin-fixture.js';

test.skip(
  !readE2EEnvironment().mockAuth,
  'Set HODOR_E2E_MOCK_AUTH=true for the isolated recycle bin UI suite.',
);

test('lists deletion details, pages and searches the selected resource', async ({
  page,
}, testInfo) => {
  const fixture = await installRecycleBinFixture(page, {
    rows: Array.from({ length: 12 }, (_, index) => deletedDepartment(index + 1)),
  });
  await page.goto('/#/admin/recycle-bin');
  const table = page.getByRole('table', { name: 'Recycle Bin' });
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
  await page.getByLabel('Search name').fill('Department 2');
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

test('uses the authorized resource catalogue and preserves string IDs without department permissions', async ({
  page,
}) => {
  const row = deletedRecord(reportResource.resourceType, 'report/001', {
    name: 'Quarterly report',
  });
  const fixture = await installRecycleBinFixture(page, {
    permissions: recycleBinPermissions.filter(
      (permission) => !permission.startsWith('admin.system.department:'),
    ),
    resources: [reportResource],
    rows: [row],
  });
  const requests: unknown[] = [];
  await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
    requests.push(route.request().postDataJSON());
    fixture.rows = [];
    await route.fulfill(fulfillOk(1));
  });
  await page.goto('/#/admin/recycle-bin');
  await expect(page.getByRole('combobox', { name: 'Resource type' })).toHaveText('Reports');
  await expect(page.getByRole('cell', { name: row.name, exact: true })).toBeVisible();
  expect(fixture.resourcesRequests).toEqual([{}]);
  expect(fixture.listRequests[0]).toEqual({
    resourceType: reportResource.resourceType,
    keyword: '',
    pageNo: 1,
    pageSize: 10,
  });
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Reports');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('cell', { name: row.name, exact: true })).toHaveCount(0);
  expect(requests).toEqual([
    {
      resourceType: row.resourceType,
      id: 'report/001',
      expectedDeletedTimeUtc: row.deletedTimeUtc,
    },
  ]);
  expect(fixture.unexpectedRequests).toEqual([]);
});

test('same IDs in different resources remain isolated when switching and purging', async ({
  page,
}, testInfo) => {
  const department = deletedDepartment(1);
  const report = deletedRecord(reportResource.resourceType, 1, { name: 'Report with shared ID' });
  const fixture = await installRecycleBinFixture(page, {
    resources: [{ ...departmentResource, canPurge: true }, reportResource],
    rows: [department, report],
  });
  const requests: unknown[] = [];
  await page.route('**/api/v1/admin/maintenance/recycle-bin/purge', async (route) => {
    requests.push(route.request().postDataJSON());
    fixture.rows = fixture.rows.filter(
      (row) => row.resourceType !== report.resourceType || row.id !== report.id,
    );
    await route.fulfill(fulfillOk(1));
  });
  await page.goto('/#/admin/recycle-bin');
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(department.name);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('combobox', { name: 'Resource type' }).click();
  await page.getByRole('option', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('cell', { name: report.name, exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: department.name, exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Permanently delete', exact: true })).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('recycle-bin-multi-resource.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Permanently delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(report.name);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requests).toEqual([
    {
      resourceType: report.resourceType,
      id: report.id,
      expectedDeletedTimeUtc: report.deletedTimeUtc,
    },
  ]);
  await page.getByRole('combobox', { name: 'Resource type' }).click();
  await page.getByRole('option', { name: 'Department', exact: true }).click();
  await expect(page.getByRole('cell', { name: department.name, exact: true })).toBeVisible();
  expect(fixture.rows).toEqual([department]);
});

test('switching resources clears search and page and ignores the previous delayed response', async ({
  page,
}) => {
  const report = deletedRecord(reportResource.resourceType, '1', {
    name: 'Current report',
    canRestore: false,
  });
  const fixture = await installRecycleBinFixture(page, {
    resources: [departmentResource, { ...reportResource, canRestore: false, canPurge: false }],
    rows: [...Array.from({ length: 12 }, (_, index) => deletedDepartment(index + 1)), report],
  });
  let releaseOldResponse: (() => void) | undefined;
  let slowRequests = 0;
  const oldResponseGate = new Promise<void>((resolve) => {
    releaseOldResponse = resolve;
  });
  await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
    const request = route.request().postDataJSON() as { resourceType: string; pageNo: number };
    if (request.resourceType !== 'department' || request.pageNo !== 2) {
      await route.fallback();
      return;
    }
    slowRequests += 1;
    await oldResponseGate;
    await route.fulfill(
      fulfillOk({
        list: [deletedDepartment(12, { name: 'Stale department' })],
        total: 12,
        totalPage: 2,
        currentPage: 2,
        pageSize: 10,
        canRestore: true,
        canPurge: true,
      }),
    );
  });
  await page.goto('/#/admin/recycle-bin');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect.poll(() => slowRequests).toBe(1);
  await page.getByLabel('Search name').fill('Discard this search');
  await page.getByRole('combobox', { name: 'Resource type' }).click();
  await page.getByRole('option', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('cell', { name: report.name, exact: true })).toBeVisible();
  await expect(page.getByLabel('Search name')).toHaveValue('');
  expect(fixture.listRequests.at(-1)).toEqual({
    resourceType: report.resourceType,
    keyword: '',
    pageNo: 1,
    pageSize: 10,
  });
  const delivered = page.waitForResponse((response) => {
    if (!response.url().endsWith('/recycle-bin/list')) return false;
    const request = response.request().postDataJSON() as { resourceType: string; pageNo: number };
    return request.resourceType === 'department' && request.pageNo === 2;
  });
  releaseOldResponse?.();
  await (await delivered).finished();
  await expect(page.getByRole('cell', { name: 'Stale department', exact: true })).toHaveCount(0);
  await expect(page.getByRole('cell', { name: report.name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Permanently delete', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('Within retention period', { exact: true })).toBeVisible();
  await expect(page.getByText('Expired, awaiting purge', { exact: true })).toHaveCount(0);
});

test('resource catalogue failures can be retried without defaulting to departments', async ({
  page,
}) => {
  const report = deletedRecord(reportResource.resourceType, 'report-1', { name: 'Retry report' });
  const fixture = await installRecycleBinFixture(page, {
    resources: [reportResource],
    rows: [report],
  });
  let attempts = 0;
  await page.route('**/api/v1/admin/maintenance/recycle-bin/resources', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Catalogue unavailable' }),
      });
    } else {
      await route.fallback();
    }
  });
  await page.goto('/#/admin/recycle-bin');
  const alert = page.getByRole('alert').filter({ hasText: 'Resource types could not be loaded.' });
  await expect(alert).toBeVisible();
  expect(fixture.listRequests).toEqual([]);
  await expect(page.getByRole('combobox', { name: 'Resource type' })).toHaveCount(0);
  await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('cell', { name: report.name, exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  expect(fixture.listRequests[0]).toMatchObject({ resourceType: report.resourceType });
});

test('an empty resource catalogue can be refreshed when a resource becomes available', async ({
  page,
}) => {
  const report = deletedRecord(reportResource.resourceType, 'available', {
    name: 'Available report',
  });
  const fixture = await installRecycleBinFixture(page, { resources: [], rows: [report] });
  await page.goto('/#/admin/recycle-bin');
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'No resource types are available to your account.' });
  await expect(alert).toBeVisible();
  expect(fixture.listRequests).toEqual([]);
  fixture.resources = [reportResource];
  await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('cell', { name: report.name, exact: true })).toBeVisible();
});

test('a failed resource list shows a retry action without claiming there are no records', async ({
  page,
}) => {
  await installRecycleBinFixture(page);
  let attempts = 0;
  await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'List temporarily unavailable' }),
      });
    } else {
      await route.fallback();
    }
  });
  await page.goto('/#/admin/recycle-bin');
  const alert = page.getByRole('alert').filter({ hasText: 'Records could not be loaded.' });
  await expect(alert).toBeVisible();
  await expect(page.getByRole('cell', { name: 'No data', exact: true })).toHaveCount(0);
  await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});

for (const missing of ['admin.maintenance.recycle_bin:read', 'admin.system.department:read']) {
  test(`does not request deleted records without ${missing}`, async ({ page }) => {
    const fixture = await installRecycleBinFixture(page, {
      permissions: recycleBinPermissions.filter((permission) => permission !== missing),
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(
      page.getByText(
        missing === 'admin.maintenance.recycle_bin:read'
          ? 'Viewing the recycle bin requires recycle bin read permission.'
          : 'No resource types are available to your account.',
        { exact: true },
      ),
    ).toBeVisible();
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
    await expect(page.getByText('Within retention period', { exact: true })).toBeVisible();
    await expect(page.getByText('Expired, awaiting purge', { exact: true })).toHaveCount(0);
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
  { message: 'A department with this name already exists.', status: 200 },
  { message: 'A department with this name already exists.', status: 409 },
  { message: 'The parent department is deleted.', status: 409 },
  { message: 'The deletion version has changed. Refresh the recycle bin.', status: 409 },
  { message: 'The deletion service is unavailable.', status: 503 },
]) {
  test(`failed restore with HTTP ${failure.status} retains the selected row and reports: ${failure.message}`, async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', (route) =>
      route.fulfill({
        status: failure.status,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          message: failure.message,
          data: failure.status === 200 ? { code: 'errorHandler.department.nameConflict' } : null,
        }),
      }),
    );
    await page.goto('/#/admin/recycle-bin');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    const previousListRequests = fixture.listRequests.length;
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText(failure.message, { exact: true })).toBeVisible();
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
  const table = page.getByRole('table', { name: 'Recycle Bin' });
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
  const table = page.getByRole('table', { name: '回收站' });
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
