import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  deletedDepartment,
  deletedRecord,
  departmentResource,
  fulfillOk,
  installRecycleBinFixture,
  openRecycleBinAccountWindow,
  recycleBinFixtureUser,
  recycleBinPermissions,
  reportResource,
} from '../support/recycle-bin-fixture.js';

test.skip(
  !readE2EEnvironment().mockAuth,
  'Set HODOR_E2E_MOCK_AUTH=true for the isolated recycle bin UI suite.',
);

async function setPageVisibility(page: Page, visibility: 'visible' | 'hidden') {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, visibility);
}

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
        serverTimeUtc: Date.now() + 60 * 24 * 60 * 60 * 1000,
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

for (const queryChange of ['pagination', 'search'] as const) {
  test(`failed ${queryChange} clears previous results and retries the current query`, async ({
    page,
  }, testInfo) => {
    const fixture = await installRecycleBinFixture(page, {
      resources: [reportResource],
      rows: Array.from({ length: 12 }, (_, index) =>
        deletedRecord(reportResource.resourceType, `report/${index + 1}`, {
          name: `Report ${index + 1}`,
        }),
      ),
    });
    const paginationWarnings: string[] = [];
    page.on('console', (message) => {
      if (/TablePagination|out of range/i.test(message.text())) {
        paginationWarnings.push(message.text());
      }
    });
    await page.goto('/#/admin/recycle-bin');
    const table = page.getByRole('table', { name: 'Recycle Bin' });
    await expect(table.getByRole('cell', { name: 'Report 1', exact: true })).toBeVisible();
    if (queryChange === 'search') {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(table.getByRole('cell', { name: 'Report 12', exact: true })).toBeVisible();
    }
    const requests: unknown[] = [];
    let releaseFailure: (() => void) | undefined;
    const failureGate = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 1) {
        await failureGate;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, message: 'Changed query unavailable' }),
        });
      } else {
        await route.fallback();
      }
    });
    if (queryChange === 'pagination') {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    } else {
      await page.getByLabel('Search name').fill('Report 2');
      await page.getByRole('button', { name: 'Search', exact: true }).click();
    }
    try {
      await expect.poll(() => requests.length).toBe(1);
      await expect(table.getByRole('row')).toHaveCount(1);
      await expect(table.getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
      await expect(page.getByText(/of 12$/, { exact: false })).toHaveCount(0);
    } finally {
      releaseFailure?.();
    }
    const alert = page.getByRole('alert').filter({ hasText: 'Records could not be loaded.' });
    await expect(alert).toBeVisible();
    await expect(page.getByText('Changed query unavailable', { exact: true })).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(1);
    await expect(table.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'No data', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
    if (queryChange === 'pagination') {
      await page.screenshot({
        path: testInfo.outputPath('recycle-bin-query-failed.png'),
        fullPage: true,
      });
    }
    await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
    const expectedQuery = {
      resourceType: reportResource.resourceType,
      keyword: queryChange === 'search' ? 'Report 2' : '',
      pageNo: queryChange === 'search' ? 1 : 2,
      pageSize: 10,
    };
    await expect(
      table.getByRole('cell', {
        name: queryChange === 'search' ? 'Report 2' : 'Report 12',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(queryChange === 'search' ? '1–1 of 1' : '11–12 of 12', { exact: true }),
    ).toBeVisible();
    expect(requests).toEqual([expectedQuery, expectedQuery]);
    expect(fixture.listRequests.at(-1)).toEqual(expectedQuery);
    expect(fixture.unexpectedRequests).toEqual([]);
    expect(paginationWarnings).toEqual([]);
  });
}

for (const action of ['restore', 'purge'] as const) {
  test(`successful ${action} followed by a failed refresh hides stale rows and only retries the list`, async ({
    page,
  }) => {
    const row = deletedRecord(reportResource.resourceType, 'report/001', {
      name: 'Processed report',
    });
    const remaining = deletedRecord(reportResource.resourceType, 'report/002', {
      name: 'Remaining report',
    });
    const fixture = await installRecycleBinFixture(page, {
      resources: [reportResource],
      rows: [row, remaining],
    });
    const mutationRequests: unknown[] = [];
    await page.route(`**/api/v1/admin/maintenance/recycle-bin/${action}`, async (route) => {
      mutationRequests.push(route.request().postDataJSON());
      fixture.rows = [remaining];
      await route.fulfill(fulfillOk(1));
    });
    let listAttempts = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
      listAttempts += 1;
      if (listAttempts === 2) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, message: 'Refresh temporarily unavailable' }),
        });
      } else {
        await route.fallback();
      }
    });
    await page.goto('/#/admin/recycle-bin');
    const table = page.getByRole('table', { name: 'Recycle Bin' });
    await table
      .getByRole('row')
      .filter({ hasText: row.name })
      .getByRole('button', {
        name: action === 'restore' ? 'Restore' : 'Permanently delete',
        exact: true,
      })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Records could not be loaded.' });
    await expect(alert).toBeVisible();
    await expect(page.getByText('Refresh temporarily unavailable', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(1);
    await expect(table.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'No data', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
    await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(table.getByRole('cell', { name: remaining.name, exact: true })).toBeVisible();
    await expect(table.getByRole('cell', { name: row.name, exact: true })).toHaveCount(0);
    expect(listAttempts).toBe(3);
    expect(mutationRequests).toEqual([
      { resourceType: row.resourceType, id: row.id, expectedDeletedTimeUtc: row.deletedTimeUtc },
    ]);
    expect(fixture.listRequests).toEqual([
      { resourceType: row.resourceType, keyword: '', pageNo: 1, pageSize: 10 },
      { resourceType: row.resourceType, keyword: '', pageNo: 1, pageSize: 10 },
    ]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
}

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
  await page.clock.install({ time: now });
  await installRecycleBinFixture(page, {
    serverTimeUtc: now,
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
  await page.clock.runFor(10_000);
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('Expired, awaiting purge');
});

test.describe('server clock', () => {
  test('reports the server expiry rejection without replaying the restore or reporting success', async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    let mutations = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
      mutations += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          message: 'The restore deadline has passed.',
          data: { code: 'errorHandler.department.restoreExpired' },
        }),
      });
    });
    await page.goto('/#/admin/recycle-bin');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('The restore deadline has passed.', { exact: true })).toBeVisible();
    await expect(page.getByText('Operation successful', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
    expect(mutations).toBe(1);
    expect(fixture.listRequests).toHaveLength(1);
  });

  for (const offset of [-2, 2]) {
    test(`uses server time when the device clock differs by ${offset} days`, async ({ page }) => {
      const serverTimeUtc = Date.now();
      await page.clock.install({ time: serverTimeUtc + offset * 24 * 60 * 60 * 1000 });
      await installRecycleBinFixture(page, {
        serverTimeUtc,
        rows: [
          deletedDepartment(1, { expiresTimeUtc: serverTimeUtc + 60_000 }),
          deletedDepartment(2, { expiresTimeUtc: serverTimeUtc }),
        ],
      });
      await page.goto('/#/admin/recycle-bin');
      const retained = page.getByRole('row').filter({ hasText: 'Department 1' });
      const expired = page.getByRole('row').filter({ hasText: 'Department 2' });
      await expect(retained.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
      await expect(retained).toContainText('Within retention period');
      await expect(expired.getByRole('button', { name: 'Restore', exact: true })).toBeDisabled();
      await expect(expired).toContainText('Expired, awaiting purge');
    });
  }

  test('clock jumps resynchronize without expiring or reviving records from the device time', async ({
    page,
  }) => {
    const serverTimeUtc = Date.now();
    await page.clock.install({ time: serverTimeUtc });
    const fixture = await installRecycleBinFixture(page, {
      serverTimeUtc,
      rows: [
        deletedDepartment(1, { expiresTimeUtc: serverTimeUtc + 60_000 }),
        deletedDepartment(2, { expiresTimeUtc: serverTimeUtc }),
      ],
    });
    await page.goto('/#/admin/recycle-bin');
    const retained = page.getByRole('row').filter({ hasText: 'Department 1' });
    await expect(retained.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
    for (const offset of [2, -2]) {
      const previous = fixture.listRequests.length;
      // Date changes without advancing performance: also models a paused monotonic clock on wake.
      await page.clock.setSystemTime(serverTimeUtc + offset * 24 * 60 * 60 * 1000);
      await page.clock.runFor(1000);
      await expect.poll(() => fixture.listRequests.length).toBe(previous + 1);
      await expect(retained.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
      await expect(retained).toContainText('Within retention period');
      await expect(page.getByRole('row').filter({ hasText: 'Department 2' })).toContainText(
        'Expired, awaiting purge',
      );
    }
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('confirmation recalculates the deadline between display ticks', async ({ page }) => {
    const serverTimeUtc = Date.now();
    await page.clock.install({ time: serverTimeUtc });
    const fixture = await installRecycleBinFixture(page, { serverTimeUtc });
    const mutations: unknown[] = [];
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
      mutations.push(route.request().postDataJSON());
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
    await page.clock.pauseAt(serverTimeUtc + 60_000);
    fixture.rows = [deletedDepartment(1, { expiresTimeUtc: serverTimeUtc + 500 })];
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    // Move only the sampled monotonic time; keep the rendering timer paused until the click.
    await page.evaluate(() => {
      const nextTime = performance.now() + 500;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => nextTime });
    });
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(confirm).toBeDisabled();
    await expect(page.getByRole('dialog')).toContainText('Expired, awaiting purge');
    expect(mutations).toEqual([]);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  for (const invalidTime of [undefined, -1, 1.5]) {
    test(`rejects a missing or invalid time anchor (${String(invalidTime)}) and can retry`, async ({
      page,
    }) => {
      const fixture = await installRecycleBinFixture(page);
      let attempts = 0;
      await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await route.fulfill(
            fulfillOk({
              serverTimeUtc: invalidTime,
              list: fixture.rows,
              total: 1,
              totalPage: 1,
              currentPage: 1,
              pageSize: 10,
              canRestore: true,
              canPurge: true,
            }),
          );
        } else await route.fallback();
      });
      await page.goto('/#/admin/recycle-bin');
      const alert = page.getByRole('alert').filter({ hasText: 'Records could not be loaded.' });
      await expect(alert).toBeVisible();
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(1);
      await expect(page.getByRole('table').getByRole('button')).toHaveCount(0);
      await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
      expect(attempts).toBe(2);
    });
  }

  test('returning from the background invalidates confirmation and retries the same query after failure', async ({
    page,
  }) => {
    const serverTimeUtc = Date.now();
    const fixture = await installRecycleBinFixture(page, {
      serverTimeUtc,
      rows: [deletedDepartment(1, { expiresTimeUtc: serverTimeUtc + 60_000 })],
    });
    await page.goto('/#/admin/recycle-bin');
    await page.getByLabel('Search name').fill('Department 1');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect.poll(() => fixture.listRequests.length).toBe(2);
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    let attempts = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
      attempts += 1;
      if (attempts === 1)
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, message: 'Wake synchronization unavailable' }),
        });
      else await route.fallback();
    });
    await setPageVisibility(page, 'hidden');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(attempts).toBe(0);
    fixture.serverTimeUtc = serverTimeUtc + 60_000;
    await setPageVisibility(page, 'visible');
    const alert = page.getByRole('alert').filter({ hasText: 'Records could not be loaded.' });
    await expect(alert).toBeVisible();
    await expect(page.getByRole('table').getByRole('button')).toHaveCount(0);
    await alert.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeDisabled();
    await expect(page.getByText('Expired, awaiting purge', { exact: true })).toBeVisible();
    expect(attempts).toBe(2);
    expect(fixture.listRequests.at(-1)).toEqual({
      resourceType: 'department',
      keyword: 'Department 1',
      pageNo: 1,
      pageSize: 10,
    });
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('BFCache and resume events share a single synchronization', async ({ page }) => {
    const fixture = await installRecycleBinFixture(page);
    await page.goto('/#/admin/recycle-bin');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    let attempts = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/v1/admin/maintenance/recycle-bin/list', async (route) => {
      attempts += 1;
      await gate;
      await route.fallback();
    });
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      document.dispatchEvent(new Event('resume'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => attempts).toBe(1);
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('table').getByRole('button')).toHaveCount(0);
    release?.();
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
    expect(attempts).toBe(1);
    expect(fixture.listRequests).toHaveLength(2);
  });

  for (const succeeds of [true, false]) {
    test(`defers wake synchronization until the in-flight mutation settles (${succeeds ? 'success' : 'failure'})`, async ({
      page,
    }) => {
      const fixture = await installRecycleBinFixture(page);
      let mutations = 0;
      let release: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
        mutations += 1;
        await gate;
        if (succeeds) {
          fixture.rows = [];
          await route.fulfill(fulfillOk(1));
        } else
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ ok: false, message: 'Pending restore failed' }),
          });
      });
      await page.goto('/#/admin/recycle-bin');
      await page.getByRole('button', { name: 'Restore', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect.poll(() => mutations).toBe(1);
      await setPageVisibility(page, 'hidden');
      await setPageVisibility(page, 'visible');
      expect(fixture.listRequests).toHaveLength(1);
      release?.();
      await expect.poll(() => fixture.listRequests.length).toBe(2);
      if (succeeds)
        await expect(page.getByRole('cell', { name: 'No data', exact: true })).toBeVisible();
      else {
        await expect(page.getByText('Pending restore failed', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeEnabled();
      }
      expect(mutations).toBe(1);
      expect(fixture.unexpectedRequests).toEqual([]);
    });
  }
});

test.describe('session isolation', () => {
  const nextUser = {
    id: 84,
    username: 'fixture_account_b',
    token: 'mock-account-b',
    langCode: 'en-US',
  };

  async function storeUser(accountWindow: Page, user: typeof recycleBinFixtureUser) {
    await accountWindow.evaluate((value) => {
      const stored = localStorage.getItem('userInfo');
      const previous = stored ? (JSON.parse(stored) as { token?: string }) : null;
      if (previous?.token !== value.token) {
        localStorage.setItem('hodor:auth-session', crypto.randomUUID());
      }
      localStorage.setItem('userInfo', JSON.stringify(value));
    }, user);
  }

  async function currentUsername(page: Page) {
    return page.evaluate(() => {
      const raw = localStorage.getItem('userInfo');
      return raw ? (JSON.parse(raw) as { username: string }).username : null;
    });
  }

  async function settleResponse(page: Page) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
  }

  test('another account replaces the old confirmation, permissions and resource catalogue', async ({
    page,
  }, testInfo) => {
    const oldRow = deletedDepartment(1, { name: 'Previous account department' });
    const nextRow = deletedRecord(reportResource.resourceType, 'account-b-report', {
      name: 'Current account report',
    });
    const fixture = await installRecycleBinFixture(page, { canPurge: true, rows: [oldRow] });
    let mutations = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/purge', async (route) => {
      mutations += 1;
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(page.getByRole('cell', { name: oldRow.name, exact: true })).toBeVisible();
    const accountWindow = await openRecycleBinAccountWindow(page);
    await page.getByRole('button', { name: 'Permanently delete', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(oldRow.name);
    const previousPermissionRequests = fixture.permissionRequests.length;
    const previousCatalogueRequests = fixture.resourcesRequests.length;
    fixture.permissions = ['admin.maintenance.recycle_bin:read'];
    fixture.resources = [{ ...reportResource, canRestore: false, canPurge: false }];
    fixture.rows = [nextRow];
    await storeUser(accountWindow, nextUser);
    await expect(page.getByRole('cell', { name: nextRow.name, exact: true })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText(nextUser.username);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('cell', { name: oldRow.name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Resource type' })).toHaveText('Reports');
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Permanently delete', exact: true })).toHaveCount(
      0,
    );
    expect(fixture.permissionRequests.length).toBeGreaterThan(previousPermissionRequests);
    expect(fixture.resourcesRequests.length).toBeGreaterThan(previousCatalogueRequests);
    expect(mutations).toBe(0);
    expect(fixture.unexpectedRequests).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('recycle-bin-account-replaced.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });

  for (const logout of ['remove', 'clear'] as const) {
    test(`cross-window ${logout} removes protected rows and an unsubmitted confirmation`, async ({
      page,
    }) => {
      const fixture = await installRecycleBinFixture(page, { canPurge: true });
      let mutations = 0;
      await page.route('**/api/v1/admin/maintenance/recycle-bin/purge', async (route) => {
        mutations += 1;
        await route.fulfill(fulfillOk(1));
      });
      await page.goto('/#/admin/recycle-bin');
      await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
      const accountWindow = await openRecycleBinAccountWindow(page);
      await page.getByRole('button', { name: 'Permanently delete', exact: true }).click();
      await accountWindow.evaluate((method) => {
        if (method === 'remove') localStorage.removeItem('userInfo');
        else localStorage.clear();
      }, logout);
      await expect(page.getByLabel(/Username|用户名/i)).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('table', { name: 'Recycle Bin' })).toHaveCount(0);
      expect(await currentUsername(page)).toBeNull();
      expect(mutations).toBe(0);
      expect(fixture.unexpectedRequests).toEqual([]);
    });
  }

  for (const outcome of ['success', 'unauthorized', 'totp-required'] as const) {
    test(`a previous account's delayed ${outcome} response cannot affect the current account`, async ({
      page,
    }) => {
      const fixture = await installRecycleBinFixture(page);
      let mutations = 0;
      let release: (() => void) | undefined;
      const responseGate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
        mutations += 1;
        expect(route.request().headers().authorization).toBe(
          `Bearer ${recycleBinFixtureUser.token}`,
        );
        await responseGate;
        await route.fulfill(
          outcome === 'success'
            ? fulfillOk(1)
            : {
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                  ok: false,
                  message: 'Previous account request expired',
                  data: outcome === 'totp-required' ? { code: 'TOTP_GATE_REQUIRED' } : null,
                }),
              },
        );
      });
      await page.goto('/#/admin/recycle-bin');
      const accountWindow = await openRecycleBinAccountWindow(page);
      await page.getByRole('button', { name: 'Restore', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect.poll(() => mutations).toBe(1);
      fixture.rows = [deletedDepartment(2, { name: 'Current account record' })];
      await storeUser(accountWindow, nextUser);
      await expect(
        page.getByRole('cell', { name: 'Current account record', exact: true }),
      ).toBeVisible();
      const currentListRequests = fixture.listRequests.length;
      const completed = page.waitForEvent('requestfinished', {
        predicate: (request) => request.url().endsWith('/recycle-bin/restore'),
      });
      release?.();
      await completed;
      await settleResponse(page);
      await expect(
        page.getByRole('cell', { name: 'Current account record', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('banner')).toContainText(nextUser.username);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(
        page.getByRole('heading', { name: /Security verification|二次安全验证/i }),
      ).toHaveCount(0);
      await expect(page.getByText('Operation successful', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Previous account request expired', { exact: true })).toHaveCount(
        0,
      );
      expect(await currentUsername(page)).toBe(nextUser.username);
      expect(fixture.listRequests).toHaveLength(currentListRequests);
      expect(mutations).toBe(1);
      expect(fixture.unexpectedRequests).toEqual([]);
    });
  }

  test('closing an earlier session-expired notice cannot log out a newly validated account', async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    let mutations = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
      mutations += 1;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Previous account request expired' }),
      });
    });
    await page.goto('/#/admin/recycle-bin');
    const accountWindow = await openRecycleBinAccountWindow(page);
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    const notice = page
      .getByRole('dialog')
      .filter({ hasText: 'Session expired, please login again' });
    await expect(notice).toBeVisible();
    fixture.rows = [deletedDepartment(2, { name: 'Newly validated account record' })];
    await storeUser(accountWindow, nextUser);
    await expect(
      page.getByRole('cell', {
        name: 'Newly validated account record',
        exact: true,
        includeHidden: true,
      }),
    ).toBeVisible();
    await notice.getByRole('button', { name: 'Confirm', exact: true }).click();
    await settleResponse(page);
    await expect(
      page.getByRole('cell', { name: 'Newly validated account record', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('banner')).toContainText(nextUser.username);
    expect(await currentUsername(page)).toBe(nextUser.username);
    expect(mutations).toBe(1);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('a rapid A to B to A switch does not revive the first A request', async ({ page }) => {
    const fixture = await installRecycleBinFixture(page);
    let mutations = 0;
    let release: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
      mutations += 1;
      await responseGate;
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    const accountWindow = await openRecycleBinAccountWindow(page);
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect.poll(() => mutations).toBe(1);
    const oldPermissionRequests = fixture.permissionRequests.length;
    fixture.rows = [deletedDepartment(2, { name: 'Revalidated account A record' })];
    await accountWindow.evaluate(
      ({ first, second }) => {
        localStorage.setItem('userInfo', JSON.stringify(second));
        localStorage.setItem('userInfo', JSON.stringify(first));
      },
      { first: recycleBinFixtureUser, second: nextUser },
    );
    await expect(
      page.getByRole('cell', { name: 'Revalidated account A record', exact: true }),
    ).toBeVisible();
    expect(fixture.permissionRequests.length).toBeGreaterThan(oldPermissionRequests);
    const currentListRequests = fixture.listRequests.length;
    const completed = page.waitForEvent('requestfinished', {
      predicate: (request) => request.url().endsWith('/recycle-bin/restore'),
    });
    release?.();
    await completed;
    await settleResponse(page);
    await expect(
      page.getByRole('cell', { name: 'Revalidated account A record', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Operation successful', { exact: true })).toHaveCount(0);
    expect(await currentUsername(page)).toBe(recycleBinFixtureUser.username);
    expect(fixture.listRequests).toHaveLength(currentListRequests);
    expect(mutations).toBe(1);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('same-token profile changes update the header without resetting the query or confirmation', async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    let mutations = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
      mutations += 1;
      fixture.rows = [];
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
    const accountWindow = await openRecycleBinAccountWindow(page);
    await page.getByLabel('Search name').fill('Department 1');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    const requestsBefore = {
      permissions: fixture.permissionRequests.length,
      resources: fixture.resourcesRequests.length,
      list: fixture.listRequests.length,
    };
    const updatedUser = { ...recycleBinFixtureUser, username: 'Updated fixture name' };
    await storeUser(accountWindow, updatedUser);
    await expect(page.getByRole('banner', { includeHidden: true })).toContainText(
      updatedUser.username,
    );
    await expect(page.getByRole('dialog')).toContainText('Department 1');
    await expect(page.getByLabel('Search name')).toHaveValue('Department 1');
    expect({
      permissions: fixture.permissionRequests.length,
      resources: fixture.resourcesRequests.length,
      list: fixture.listRequests.length,
    }).toEqual(requestsBefore);
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('Operation successful', { exact: true })).toBeVisible();
    expect(mutations).toBe(1);
    expect(await currentUsername(page)).toBe(updatedUser.username);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('a confirmation cannot send under changed credentials before the auth event is delivered', async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page, { canPurge: true });
    let mutations = 0;
    await page.route('**/api/v1/admin/maintenance/recycle-bin/purge', async (route) => {
      mutations += 1;
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    await page.getByRole('button', { name: 'Permanently delete', exact: true }).click();
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirm).toBeEnabled();
    fixture.rows = [deletedDepartment(2, { name: 'Account B after deferred notification' })];
    await confirm.evaluate((button, user) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error('Expected confirmation button');
      localStorage.setItem('userInfo', JSON.stringify(user));
      // The click shares the storage write's task: React has not received an identity event.
      button.click();
    }, nextUser);
    await settleResponse(page);
    expect(mutations).toBe(0);
    await expect(page.getByText('Operation successful', { exact: true })).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event('hodor:auth-changed')));
    await expect(
      page.getByRole('cell', { name: 'Account B after deferred notification', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('banner')).toContainText(nextUser.username);
    expect(mutations).toBe(0);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('a rotated session marker rejects old A work before an A to B to A event is delivered', async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    let mutations = 0;
    let release: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/v1/admin/maintenance/recycle-bin/restore', async (route) => {
      mutations += 1;
      await responseGate;
      await route.fulfill(fulfillOk(1));
    });
    await page.goto('/#/admin/recycle-bin');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect.poll(() => mutations).toBe(1);
    fixture.rows = [deletedDepartment(2, { name: 'Account A with a new session marker' })];
    await page.evaluate(
      ({ first, second }) => {
        localStorage.setItem('hodor:auth-session', 'fixture-session-b');
        localStorage.setItem('userInfo', JSON.stringify(second));
        localStorage.setItem('hodor:auth-session', 'fixture-session-a-next');
        localStorage.setItem('userInfo', JSON.stringify(first));
      },
      { first: recycleBinFixtureUser, second: nextUser },
    );
    const completed = page.waitForEvent('requestfinished', {
      predicate: (request) => request.url().endsWith('/recycle-bin/restore'),
    });
    release?.();
    await completed;
    await settleResponse(page);
    await expect(page.getByText('Operation successful', { exact: true })).toHaveCount(0);
    expect(mutations).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event('hodor:auth-changed')));
    await expect(
      page.getByRole('cell', { name: 'Account A with a new session marker', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await currentUsername(page)).toBe(recycleBinFixtureUser.username);
    expect(mutations).toBe(1);
    expect(fixture.unexpectedRequests).toEqual([]);
  });

  test('an ignoreAbort translation response from the old session cannot overwrite the current page', async ({
    page,
  }) => {
    const fixture = await installRecycleBinFixture(page);
    let translationRequests = 0;
    let release: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/v1/admin/i18n/translation/listAll', async (route) => {
      translationRequests += 1;
      expect(route.request().headers().authorization).toBe(`Bearer ${recycleBinFixtureUser.token}`);
      await responseGate;
      await route.fulfill(
        fulfillOk([
          { langCode: 'en-US', tKey: 'recycleBin.title', tValue: 'Previous session translation' },
        ]),
      );
    });
    await page.goto('/#/admin/recycle-bin');
    await expect(page.getByRole('cell', { name: 'Department 1', exact: true })).toBeVisible();
    const accountWindow = await openRecycleBinAccountWindow(page);
    fixture.rows = [deletedDepartment(2, { name: 'Account B keeps its current translations' })];
    await storeUser(accountWindow, nextUser);
    await expect(
      page.getByRole('cell', { name: 'Account B keeps its current translations', exact: true }),
    ).toBeVisible();
    const completed = page.waitForEvent('requestfinished', {
      predicate: (request) => request.url().endsWith('/translation/listAll'),
    });
    release?.();
    await completed;
    await settleResponse(page);
    await expect(page.getByRole('heading', { name: 'Recycle Bin', exact: true })).toBeVisible();
    await expect(page.getByText('Previous session translation', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('banner')).toContainText(nextUser.username);
    expect(translationRequests).toBe(1);
    expect(fixture.unexpectedRequests).toEqual([]);
  });
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
