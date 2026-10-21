import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import { installRoleUndoFixture, undoRole } from '../support/role-undo-fixture.js';
import {
  fulfillOk,
  openRecycleBinAccountWindow,
  recycleBinFixtureUser,
} from '../support/recycle-bin-fixture.js';
import type { UndoRequest } from '../support/delete-undo-fixture.js';

test.skip(!readE2EEnvironment().mockAuth, 'Requires the isolated mock-auth browser fixture.');
test.use({ storageState: { cookies: [], origins: [] } });

const undoUrl = '**/api/v1/admin/maintenance/recycle-bin/undo';
const listUrl = '**/api/v1/admin/system/role/list';
const name = 'Undo role 2';
const toast = (page: Page, recordName = name) =>
  page.getByRole('alert').filter({ hasText: recordName });
const row = (page: Page, recordName = name) =>
  page.getByRole('row').filter({ hasText: recordName });

function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function failure(code: string, status = 200) {
  const reasons: Record<string, string> = {
    'errorHandler.role.nameConflict': 'The role name is already in use.',
    'errorHandler.role.departmentsUnavailable': 'The saved departments are unavailable.',
    'errorHandler.role.referencedByUsers': 'Users still reference this role.',
  };
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: false,
      message: reasons[code] ?? 'Fixture request rejected',
      data: { code },
    }),
  };
}

async function submitDeletion(page: Page, recordName = name) {
  await row(page, recordName).getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('30 days');
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
}

async function deleteRole(page: Page, recordName = name) {
  await submitDeletion(page, recordName);
  await expect(
    toast(page, recordName).getByRole('button', { name: 'Undo deletion', exact: true }),
  ).toBeEnabled();
}

async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test('delete-only permission uses the list version and keyboard undo retains the disabled role', async ({
  page,
}, testInfo) => {
  const fixture = await installRoleUndoFixture(page, {
    roles: [undoRole(2, { isEnabled: false, updateTimeUtc: 12345 })],
    permissions: ['admin.system.role:read', 'admin.system.role:delete'],
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  expect(fixture.deleteRequests).toEqual([{ id: 2, expectedUpdateTimeUtc: 12345 }]);
  await expect(row(page)).toHaveCount(0);
  const receipt = fixture.deleted.get(2)?.receipt;
  await page.screenshot({ path: testInfo.outputPath('role-undo-toast.png'), fullPage: true });
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(toast(page)).toContainText('Deletion undone');
  await expect(row(page)).toContainText('Disabled');
  expect(fixture.undoRequests).toEqual([
    { resourceType: 'role', id: 2, expectedDeletedTimeUtc: receipt?.expectedDeletedTimeUtc },
  ]);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

test('read-only role access does not expose the delete action', async ({ page }) => {
  const fixture = await installRoleUndoFixture(page, { permissions: ['admin.system.role:read'] });
  await page.goto('/#/admin/system/role');
  await expect(row(page)).toBeVisible();
  await expect(row(page).getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  expect(fixture.deleteRequests).toEqual([]);
});

test('a profile notification in the same authentication session keeps the current role list', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  await page.goto('/#/admin/system/role');
  await expect(row(page)).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  await settle(page);
  await expect(row(page)).toBeVisible();
  await deleteRole(page);
  expect(fixture.deleteRequests).toHaveLength(1);
});

test('rapid confirmation clicks submit one delete and disable the pending dialog', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  const gate = deferred();
  await page.route('**/api/v1/admin/system/role/deleteWithUndo', async (route) => {
    await gate.promise;
    await route.fallback();
  });
  await page.goto('/#/admin/system/role');
  await row(page).getByRole('button', { name: 'Delete', exact: true }).click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true });
  await confirm.evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected delete button');
    button.click();
    button.click();
  });
  await expect.poll(() => fixture.deleteRequests.length).toBe(1);
  await expect(confirm).toBeDisabled();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeDisabled();
  gate.release();
  await expect(
    toast(page).getByRole('button', { name: 'Undo deletion', exact: true }),
  ).toBeEnabled();
});

test('multiple role notices retain independent versions', async ({ page }) => {
  const second = undoRole(3);
  const fixture = await installRoleUndoFixture(page, { roles: [undoRole(2), second] });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await deleteRole(page, second.name);
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(2);
  await toast(page, second.name)
    .getByRole('button', { name: 'Undo deletion', exact: true })
    .click();
  await expect(row(page, second.name)).toBeVisible();
  await expect(
    toast(page).getByRole('button', { name: 'Undo deletion', exact: true }),
  ).toBeEnabled();
  expect(fixture.undoRequests.map((request) => request.id)).toEqual([3]);
});

test('department and role notices with the same numeric ID remain distinct across page navigation', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page, {
    roles: [undoRole(1)],
    includeDepartment: true,
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page, 'Undo role 1');
  await page.evaluate(() => {
    window.location.hash = '/admin/system/department';
  });
  await page
    .getByRole('treeitem')
    .filter({ hasText: 'Undo department 1' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(2);
  await toast(page, 'Undo role 1')
    .getByRole('button', { name: 'Undo deletion', exact: true })
    .click();
  await expect(toast(page, 'Undo role 1')).toContainText('Deletion undone');
  await expect(
    toast(page, 'Undo department 1').getByRole('button', { name: 'Undo deletion', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    window.location.hash = '/admin/system/role';
  });
  await expect(row(page, 'Undo role 1')).toBeVisible();
  expect(fixture.undoRequests).toHaveLength(1);
  expect(fixture.department.deleted.has(1)).toBe(true);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

const scenarios = [
  { code: 'errorHandler.role.nameConflict', content: /name.*use/i, retry: true },
  {
    code: 'errorHandler.role.departmentsUnavailable',
    content: /departments.*unavailable/i,
    retry: true,
  },
  { code: 'errorHandler.role.staleDeletion', content: /state.*changed/i, retry: false },
  { code: 'errorHandler.role.notDeleted', content: /state.*changed/i, retry: false },
  { code: 'errorHandler.role.stateConflict', content: /state.*changed/i, retry: false },
  { code: 'errorHandler.recycleBin.undoExpired', content: /window.*ended/i, retry: false },
  { code: 'errorHandler.recycleBin.undoForbidden', content: /no longer allowed/i, retry: false },
  { code: 'PERMISSION_DENIED', content: /no longer allowed/i, retry: false },
];
for (const status of [200, 409]) {
  for (const scenario of scenarios) {
    test(`role HTTP ${status} ${scenario.code} is classified once`, async ({ page }) => {
      const fixture = await installRoleUndoFixture(page);
      await page.route(undoUrl, (route) => route.fulfill(failure(scenario.code, status)));
      await page.goto('/#/admin/system/role');
      await deleteRole(page);
      await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
      await expect(toast(page)).toContainText(scenario.content);
      await expect(page.getByRole('alert')).toHaveCount(1);
      await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toHaveCount(
        scenario.retry ? 1 : 0,
      );
      await expect(toast(page)).not.toContainText('Deletion undone');
      expect(fixture.undoRequests).toHaveLength(1);
    });
  }
}

test('role conflicts remain visible and the retry deadline never renews', async ({ page }) => {
  await page.clock.install();
  const fixture = await installRoleUndoFixture(page);
  await page.route(undoUrl, (route) =>
    route.fulfill(failure('errorHandler.role.departmentsUnavailable')),
  );
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await page.clock.fastForward(10_000);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await toast(page).getByRole('button', { name: 'Retry', exact: true }).click();
  expect(fixture.undoRequests[0]).toEqual(fixture.undoRequests[1]);
  await page.clock.fastForward(6000);
  await expect(toast(page)).toContainText(/departments.*unavailable/i);
  await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await page.clock.fastForward(30_000);
  await expect(toast(page)).toBeVisible();
});

test('hover and background time expire a role action without recycle restore permission', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installRoleUndoFixture(page, {
    permissions: ['admin.system.role:read', 'admin.system.role:delete'],
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await toast(page).hover();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(16_000);
  await expect(toast(page)).toContainText('window');
  await expect(toast(page).getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(
    0,
  );
  await expect(
    toast(page).getByRole('button', { name: 'Open recycle bin', exact: true }),
  ).toHaveCount(0);
  expect(fixture.undoRequests).toEqual([]);
});

test('an unknown role undo allows a manual retry of the identical version', async ({ page }) => {
  const fixture = await installRoleUndoFixture(page);
  let attempts = 0;
  await page.route(undoUrl, async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort('connectionreset');
    else await route.fallback();
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/result.*unknown/i);
  await expect(toast(page)).not.toContainText('Deletion undone');
  await toast(page).getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(toast(page)).toContainText('Deletion undone');
  expect(fixture.undoRequests).toHaveLength(2);
  expect(fixture.undoRequests[0]).toEqual(fixture.undoRequests[1]);
});

test('a committed role undo with a lost response is only confirmed as currently available', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  await page.route(undoUrl, async (route) => {
    const request = route.request().postDataJSON() as UndoRequest;
    fixture.restore(request.id);
    await route.abort('connectionreset');
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/currently available/i);
  await expect(toast(page)).not.toContainText('Deletion undone');
  await expect(row(page)).toBeVisible();
  await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  expect(fixture.undoRequests).toHaveLength(1);
  expect(fixture.deleteRequests).toHaveLength(1);
});

test('a 503 remains unknown even when it contains a role business code and detail is missing', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  await page.route(undoUrl, (route) =>
    route.fulfill(failure('errorHandler.role.nameConflict', 503)),
  );
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/result.*unknown/i);
  await expect.poll(() => fixture.getRequests.length).toBe(1);
  await expect(toast(page)).not.toContainText(/name.*use|purged|Deletion undone/i);
});

test('successful undo survives list failure and dismissal leaves an independent reload control', async ({
  page,
}, testInfo) => {
  const fixture = await installRoleUndoFixture(page);
  let failRefresh = false;
  await page.route(undoUrl, async (route) => {
    failRefresh = true;
    await route.fallback();
  });
  await page.route(listUrl, async (route) => {
    if (failRefresh) await route.fulfill(failure('LIST_UNAVAILABLE', 503));
    else await route.fallback();
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await expect(row(page)).toHaveCount(0);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText('Deletion undone');
  await expect(toast(page)).toContainText('could not be refreshed');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('role-refresh-failure.png'), fullPage: true });
  await toast(page).getByRole('button', { name: 'Close', exact: true }).click();
  const reload = page.getByRole('main').getByRole('button', { name: 'Reload list', exact: true });
  await expect(reload).toBeEnabled();
  failRefresh = false;
  await reload.click();
  await expect(row(page)).toBeVisible();
  expect(fixture.undoRequests).toHaveLength(1);
});

test('a delayed pre-undo list response cannot overwrite the newer restored role list', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  const gate = deferred();
  let count = 0;
  await page.route(listUrl, async (route) => {
    count += 1;
    if (count === 2) {
      await gate.promise;
      await route.fulfill(fulfillOk({ list: [], total: 0 }));
    } else await route.fallback();
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await expect.poll(() => count).toBe(2);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(row(page)).toBeVisible();
  gate.release();
  await settle(page);
  await expect(row(page)).toBeVisible();
  expect(fixture.undoRequests).toHaveLength(1);
});

test('role account switching clears toasts and does not accept the previous list response', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  const gate = deferred();
  let count = 0;
  await page.route(listUrl, async (route) => {
    count += 1;
    if (count === 2) {
      await gate.promise;
      await route.fulfill(
        fulfillOk({ list: [undoRole(99, { name: 'Previous account role' })], total: 1 }),
      );
    } else await route.fallback();
  });
  await page.goto('/#/admin/system/role');
  const account = await openRecycleBinAccountWindow(page);
  await deleteRole(page);
  await expect.poll(() => count).toBe(2);
  const user = {
    ...recycleBinFixtureUser,
    id: 84,
    username: 'role_account_b',
    token: 'mock-role-b',
  };
  await account.evaluate((nextUser) => {
    localStorage.setItem('hodor:auth-session', crypto.randomUUID());
    localStorage.setItem('userInfo', JSON.stringify(nextUser));
  }, user);
  await expect(page.getByRole('banner')).toContainText(user.username);
  await expect(toast(page)).toHaveCount(0);
  gate.release();
  await settle(page);
  await expect(row(page, 'Previous account role')).toHaveCount(0);
  expect(fixture.undoRequests).toEqual([]);
});

for (const invalidReceipt of [
  null,
  {
    resourceType: 'department',
    id: 2,
    expectedDeletedTimeUtc: 1,
    undoExpiresTimeUtc: 15_001,
    serverTimeUtc: 1,
  },
]) {
  test(`an untrusted role delete receipt (${invalidReceipt ? 'wrong resource' : 'missing'}) offers no undo or automatic delete retry`, async ({
    page,
  }) => {
    const fixture = await installRoleUndoFixture(page);
    await page.route('**/api/v1/admin/system/role/deleteWithUndo', (route) =>
      route.fulfill(fulfillOk(invalidReceipt)),
    );
    await page.goto('/#/admin/system/role');
    await submitDeletion(page);
    await expect(toast(page)).toContainText(/deletion result.*unknown/i);
    await expect(
      toast(page).getByRole('button', { name: 'Undo deletion', exact: true }),
    ).toHaveCount(0);
    expect(fixture.deleteRequests).toHaveLength(1);
    expect(fixture.undoRequests).toEqual([]);
  });
}

test('a business rejection of role deletion creates one failure notice without an undo action', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  await page.route('**/api/v1/admin/system/role/deleteWithUndo', (route) =>
    route.fulfill(failure('errorHandler.role.referencedByUsers')),
  );
  await page.goto('/#/admin/system/role');
  await submitDeletion(page);
  await expect(toast(page)).toContainText('Users still reference');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(row(page)).toBeVisible();
  await expect(toast(page).getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(
    0,
  );
  expect(fixture.deleteRequests).toHaveLength(1);
});

test('a pending role undo survives expiry and only a successful response completes it', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installRoleUndoFixture(page);
  const gate = deferred();
  await page.route(undoUrl, async (route) => {
    const request = route.request().postDataJSON() as UndoRequest;
    fixture.restore(request.id);
    await gate.promise;
    await route.fulfill(fulfillOk(request.id));
  });
  await page.goto('/#/admin/system/role');
  await deleteRole(page);
  await toast(page)
    .getByRole('button', { name: 'Undo deletion', exact: true })
    .evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error('Expected undo button');
      button.click();
      button.click();
    });
  await expect.poll(() => fixture.undoRequests.length).toBe(1);
  await expect(toast(page).getByRole('button', { name: 'Undoing…', exact: true })).toBeDisabled();
  await page.clock.fastForward(16_000);
  await expect(toast(page)).not.toContainText(/failed|Deletion undone/i);
  gate.release();
  await expect(toast(page)).toContainText('Deletion undone');
});

test('Chinese role confirmation and undo use local translations', async ({ page }, testInfo) => {
  const recordName = '测试角色撤销';
  const fixture = await installRoleUndoFixture(page, {
    langCode: 'zh-CN',
    roles: [undoRole(2, { name: recordName })],
  });
  await page.goto('/#/admin/system/role');
  await row(page, recordName).getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('保留 30 天');
  await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
  await expect(toast(page, recordName)).toContainText('已删除');
  await page.screenshot({ path: testInfo.outputPath('role-undo-toast-zh.png'), fullPage: true });
  await toast(page, recordName).getByRole('button', { name: '撤销删除', exact: true }).click();
  await expect(toast(page, recordName)).toContainText('已撤销删除');
  await expect(row(page, recordName)).toBeVisible();
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

test('a CRUD resource without softDelete retains its original confirmation and numeric delete request', async ({
  page,
}) => {
  const fixture = await installRoleUndoFixture(page);
  const requests: unknown[] = [];
  let present = true;
  await page.route('**/api/v1/admin/base/sys_config/list', (route) =>
    route.fulfill(
      fulfillOk({
        list: present
          ? [
              {
                id: 88,
                namespace: 'fixture',
                configKey: 'ordinary-crud-record',
                isEnabled: true,
                isPrimary: false,
                createTimeUtc: 1_700_000_000_000,
              },
            ]
          : [],
        total: present ? 1 : 0,
      }),
    ),
  );
  await page.route('**/api/v1/admin/base/sys_config/delete', (route) => {
    requests.push(route.request().postDataJSON());
    present = false;
    return route.fulfill(fulfillOk(88));
  });
  await page.goto('/#/admin/base/sys_config');
  await row(page, 'ordinary-crud-record')
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(page.getByRole('dialog')).not.toContainText('30 days');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(row(page, 'ordinary-crud-record')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
  expect(requests).toEqual([{ id: 88 }]);
  expect(fixture.deleteRequests).toEqual([]);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});
