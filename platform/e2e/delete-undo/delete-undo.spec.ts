import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  installDeleteUndoFixture,
  undoDepartment,
  type UndoRequest,
} from '../support/delete-undo-fixture.js';
import {
  fulfillOk,
  openRecycleBinAccountWindow,
  recycleBinFixtureUser,
} from '../support/recycle-bin-fixture.js';

test.skip(
  !readE2EEnvironment().mockAuth,
  'Set HODOR_E2E_MOCK_AUTH=true for the isolated delete undo UI suite.',
);
test.use({ storageState: { cookies: [], origins: [] } });

const undoUrl = '**/api/v1/admin/maintenance/recycle-bin/undo';
const listUrl = '**/api/v1/admin/system/department/listAll';
const departmentName = 'Undo department 1';
const nextUser = {
  ...recycleBinFixtureUser,
  id: 84,
  username: 'undo_account_b',
  token: 'mock-undo-account-b',
};

function toast(page: Page, name = departmentName) {
  return page.getByRole('alert').filter({ hasText: name });
}

function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function failure(code: string, status = 200) {
  const descriptions: Record<string, string> = {
    'errorHandler.department.nameConflict': 'The department name is already in use.',
    'errorHandler.department.invalidParent': 'The parent department is unavailable.',
  };
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: false,
      message: descriptions[code] ?? 'Fixture request rejected',
      data: { code },
    }),
  };
}

async function deleteDepartment(page: Page, name = departmentName) {
  await submitDeletion(page, name);
  await expect(
    toast(page, name).getByRole('button', { name: 'Undo deletion', exact: true }),
  ).toBeEnabled();
}

async function submitDeletion(page: Page, name = departmentName) {
  await page
    .getByRole('treeitem')
    .filter({ hasText: name })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
}

async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test('a deleter with delete permission and no restore permission can undo using the exact deletion version', async ({
  page,
}, testInfo) => {
  const fixture = await installDeleteUndoFixture(page, {
    departments: [undoDepartment(1, { isEnabled: false, updateTimeUtc: 12345 })],
    permissions: ['admin.system.department:read', 'admin.system.department:delete'],
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  expect(fixture.deleteRequests).toEqual([{ id: 1, expectedUpdateTimeUtc: 12345 }]);
  await expect(page.getByRole('treeitem')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('department-undo-toast.png'), fullPage: true });
  const receipt = fixture.deleted.get(1)?.receipt;
  expect(receipt).toBeDefined();
  const undo = toast(page).getByRole('button', { name: 'Undo deletion', exact: true });
  await undo.focus();
  await page.keyboard.press('Enter');
  await expect(toast(page)).toContainText('Deletion undone');
  await expect(page.getByRole('treeitem')).toContainText(departmentName);
  await expect(page.getByRole('treeitem')).toContainText('Disabled');
  expect(fixture.undoRequests).toEqual([
    {
      resourceType: 'department',
      id: 1,
      expectedDeletedTimeUtc: receipt?.expectedDeletedTimeUtc,
    },
  ]);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

test('multiple deletion notices keep their records and undo requests independent', async ({
  page,
}) => {
  const second = undoDepartment(2);
  const fixture = await installDeleteUndoFixture(page, {
    departments: [undoDepartment(1), second],
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await deleteDepartment(page, second.name);
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(2);
  await toast(page, second.name)
    .getByRole('button', { name: 'Undo deletion', exact: true })
    .click();
  await expect(page.getByRole('treeitem')).toContainText(second.name);
  await expect(
    toast(page).getByRole('button', { name: 'Undo deletion', exact: true }),
  ).toBeEnabled();
  expect(fixture.undoRequests.map((request) => request.id)).toEqual([2]);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(2);
  expect(fixture.undoRequests.map((request) => request.id)).toEqual([2, 1]);
});

test('repeated clicks submit once and a pending result survives expiry without being called a failure', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installDeleteUndoFixture(page);
  const gate = deferred();
  await page.route(undoUrl, async (route) => {
    const request = route.request().postDataJSON() as UndoRequest;
    fixture.restore(request.id);
    await gate.promise;
    await route.fulfill(fulfillOk(request.id));
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
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
  await expect(toast(page)).not.toContainText('failed');
  gate.release();
  await expect(toast(page)).toContainText('Deletion undone');
  expect(fixture.undoRequests).toHaveLength(1);
});

test('hover and background visibility do not extend the 15 second undo window', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installDeleteUndoFixture(page, {
    permissions: ['admin.system.department:read', 'admin.system.department:delete'],
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).hover();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(16_000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open recycle bin', exact: true })).toHaveCount(0);
  expect(fixture.undoRequests).toEqual([]);
});

for (const clockOffset of [-3, 3]) {
  test(`a ${clockOffset} day client clock jump never extends or reopens the undo window`, async ({
    page,
  }) => {
    const now = Date.now();
    await page.clock.install({ time: now });
    await installDeleteUndoFixture(page, { serverTimeUtc: now });
    await page.goto('/#/admin/system/department');
    await deleteDepartment(page);
    await page.clock.setSystemTime(now + clockOffset * 24 * 60 * 60 * 1000);
    await page.clock.runFor(1000);
    if (clockOffset < 0)
      await expect(
        toast(page).getByRole('button', { name: 'Undo deletion', exact: true }),
      ).toBeEnabled();
    else
      await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
    await page.clock.fastForward(15_000);
    await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
  });
}

const businessFailures = [
  {
    code: 'errorHandler.department.nameConflict',
    content: /name.*(?:use|exist|taken)|(?:use|exist|taken).*name/i,
    retry: true,
  },
  { code: 'errorHandler.department.invalidParent', content: /parent/i, retry: true },
  {
    code: 'errorHandler.recycleBin.undoExpired',
    content: /(?:expired|time.*over|window.*ended)/i,
    retry: false,
  },
  {
    code: 'errorHandler.recycleBin.undoForbidden',
    content: /(?:permission|allowed|authoriz)/i,
    retry: false,
  },
  {
    code: 'errorHandler.department.staleDeletion',
    content: /state.*changed|record.*changed/i,
    retry: false,
  },
  {
    code: 'errorHandler.department.notDeleted',
    content: /state.*changed|record.*changed/i,
    retry: false,
  },
  {
    code: 'errorHandler.department.stateConflict',
    content: /state.*changed|record.*changed/i,
    retry: false,
  },
];

for (const status of [200, 409]) {
  for (const scenario of businessFailures) {
    test(`HTTP ${status} ${scenario.code} produces one classified notice and the correct retry policy`, async ({
      page,
    }, testInfo) => {
      const fixture = await installDeleteUndoFixture(page);
      await page.route(undoUrl, (route) => route.fulfill(failure(scenario.code, status)));
      await page.goto('/#/admin/system/department');
      await deleteDepartment(page);
      await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
      await expect(toast(page)).toContainText(scenario.content);
      await expect(page.getByRole('alert')).toHaveCount(1);
      await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toHaveCount(
        scenario.retry ? 1 : 0,
      );
      await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
      expect(fixture.undoRequests).toHaveLength(1);
      expect(fixture.departments).toEqual([]);
      expect(fixture.base.unexpectedRequests).toEqual([]);
      if (status === 200 && scenario.code === 'errorHandler.department.nameConflict') {
        await page.screenshot({
          path: testInfo.outputPath('department-undo-conflict.png'),
          fullPage: true,
        });
      }
    });
  }
}

test('a recoverable conflict can retry the original version without renewing the deadline', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installDeleteUndoFixture(page);
  let attempts = 0;
  await page.route(undoUrl, async (route) => {
    attempts += 1;
    if (attempts === 1) await route.fulfill(failure('errorHandler.department.nameConflict'));
    else await route.fallback();
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await page.clock.fastForward(10_000);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
  await toast(page).getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(toast(page)).toContainText('Deletion undone');
  expect(fixture.undoRequests).toHaveLength(2);
  expect(fixture.undoRequests[0]).toEqual(fixture.undoRequests[1]);
});

test('a conflict remains readable after expiry but no further undo retry is possible', async ({
  page,
}) => {
  await page.clock.install();
  await installDeleteUndoFixture(page);
  await page.route(undoUrl, (route) =>
    route.fulfill(failure('errorHandler.department.invalidParent')),
  );
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await page.clock.fastForward(10_000);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/parent/i);
  await page.clock.fastForward(6000);
  await expect(toast(page)).toBeVisible();
  await expect(toast(page).getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(toast(page)).not.toContainText('Deletion undone');
  await page.clock.fastForward(15_000);
  await expect(toast(page)).toContainText(/parent/i);
});

test('an unknown network result is not called a failure and can manually retry the same version', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  let attempts = 0;
  await page.route(undoUrl, async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort('connectionreset');
    else await route.fallback();
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/result.*unknown|could not be confirmed/i);
  await expect(toast(page)).not.toContainText('Deletion undone');
  await expect(page.getByRole('alert')).toHaveCount(1);
  expect(fixture.undoRequests).toHaveLength(1);
  await toast(page).getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(toast(page)).toContainText('Deletion undone');
  expect(fixture.undoRequests).toHaveLength(2);
  expect(fixture.undoRequests[0]).toEqual(fixture.undoRequests[1]);
});

test('a 503 with a business-looking code is still an unknown commit result', async ({ page }) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.route(undoUrl, (route) =>
    route.fulfill(failure('errorHandler.department.nameConflict', 503)),
  );
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/result.*unknown|could not be confirmed/i);
  await expect(toast(page)).not.toContainText(/name.*already/i);
  await expect(page.getByRole('alert')).toHaveCount(1);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('a committed restore with a lost response can be inspected without falsely claiming this request succeeded', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.route(undoUrl, async (route) => {
    const request = route.request().postDataJSON() as UndoRequest;
    fixture.restore(request.id);
    await route.abort('connectionreset');
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).not.toContainText('Deletion undone');
  const refresh = toast(page).getByRole('button', { name: 'Refresh', exact: true });
  await expect(refresh).toBeEnabled();
  await refresh.click();
  await expect(page.getByRole('treeitem')).toContainText(departmentName);
  expect(fixture.undoRequests).toHaveLength(1);
  expect(fixture.deleteRequests).toHaveLength(1);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

test('a confirmed restore remains successful when refreshing the list fails', async ({
  page,
}, testInfo) => {
  const fixture = await installDeleteUndoFixture(page);
  let failRefresh = false;
  await page.route(undoUrl, async (route) => {
    failRefresh = true;
    await route.fallback();
  });
  await page.route(listUrl, async (route) => {
    if (failRefresh)
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Fixture refresh unavailable' }),
      });
    else await route.fallback();
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await expect(page.getByRole('treeitem')).toHaveCount(0);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText('Deletion undone');
  await expect(toast(page)).toContainText(/refresh/i);
  await expect(toast(page).getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath('department-undo-refresh-failed.png'),
    fullPage: true,
  });
  failRefresh = false;
  await toast(page).getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('treeitem')).toContainText(departmentName);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('a delayed pre-undo list cannot overwrite the newer restored tree', async ({ page }) => {
  const fixture = await installDeleteUndoFixture(page);
  const gate = deferred();
  let listCount = 0;
  await page.route(listUrl, async (route) => {
    listCount += 1;
    if (listCount === 2) {
      await gate.promise;
      await route.fulfill(fulfillOk([]));
    } else await route.fallback();
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await expect.poll(() => listCount).toBe(2);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(page.getByRole('treeitem')).toContainText(departmentName);
  gate.release();
  await settle(page);
  await expect(page.getByRole('treeitem')).toContainText(departmentName);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('same-session navigation preserves the toast and restoring off-page is visible on return', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await page.evaluate(() => {
    window.location.hash = '#/admin/recycle-bin';
  });
  await expect(page.getByRole('heading', { name: 'Recycle Bin', exact: true })).toBeVisible();
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText('Deletion undone');
  await page.evaluate(() => {
    window.location.hash = '#/admin/system/department';
  });
  await expect(page.getByRole('treeitem')).toContainText(departmentName);
  expect(fixture.undoRequests).toHaveLength(1);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

test('switching accounts clears the old deletion action', async ({ page }) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.goto('/#/admin/system/department');
  const accountWindow = await openRecycleBinAccountWindow(page);
  await deleteDepartment(page);
  await accountWindow.evaluate((user) => {
    localStorage.setItem('hodor:auth-session', crypto.randomUUID());
    localStorage.setItem('userInfo', JSON.stringify(user));
  }, nextUser);
  await expect(page.getByRole('banner')).toContainText(nextUser.username);
  await expect(toast(page)).toHaveCount(0);
  expect(fixture.undoRequests).toEqual([]);
});

test('an old undo button cannot send with new credentials before the auth event arrives', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page)
    .getByRole('button', { name: 'Undo deletion', exact: true })
    .evaluate((button, user) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error('Expected undo button');
      localStorage.setItem('userInfo', JSON.stringify(user));
      button.click();
    }, nextUser);
  await settle(page);
  expect(fixture.undoRequests).toEqual([]);
  await expect(toast(page)).toHaveCount(0);
});

test('an A to B to A session rotation does not revive the first account undo response', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  const gate = deferred();
  await page.route(undoUrl, async (route) => {
    await gate.promise;
    await route.fulfill(fulfillOk(1));
  });
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect.poll(() => fixture.undoRequests.length).toBe(1);
  await page.evaluate(
    ({ first, second }) => {
      localStorage.setItem('hodor:auth-session', 'undo-fixture-session-b');
      localStorage.setItem('userInfo', JSON.stringify(second));
      localStorage.setItem('hodor:auth-session', 'undo-fixture-session-a-next');
      localStorage.setItem('userInfo', JSON.stringify(first));
    },
    { first: recycleBinFixtureUser, second: nextUser },
  );
  const completed = page.waitForEvent('requestfinished', {
    predicate: (request) => request.url().endsWith('/recycle-bin/undo'),
  });
  gate.release();
  await completed;
  await settle(page);
  await expect(page.getByText('Deletion undone', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('a revoked delete permission reported as HTTP 403 closes the action without a duplicate error', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.route(undoUrl, (route) => route.fulfill(failure('PERMISSION_DENIED', 403)));
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/permission|allowed|authoriz/i);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(1);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('a local-error undo request still opens security verification and clears all deletion notices', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.route(undoUrl, (route) => route.fulfill(failure('TOTP_GATE_REQUIRED', 401)));
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Security verification/i })).toBeVisible();
  await expect(toast(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('userInfo') ?? 'null') as { id: number } | null;
      return user?.id;
    }),
  ).toBe(recycleBinFixtureUser.id);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('a local-error undo request preserves the expired-session notification', async ({ page }) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.route(undoUrl, (route) => route.fulfill(failure('UNAUTHORIZED', 401)));
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(/session.*expired/i);
  await expect(toast(page)).toHaveCount(0);
  expect(fixture.undoRequests).toHaveLength(1);
});

test('reloading does not persist a deletion action', async ({ page }) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await page.reload();
  await expect(page.getByRole('main').getByText('No data', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
  expect(fixture.undoRequests).toEqual([]);
});

test('expiry offers the recycle bin only with its existing read and restore permissions', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installDeleteUndoFixture(page);
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await page.clock.fastForward(16_000);
  await expect(toast(page)).toContainText(/window.*ended/i);
  await toast(page).getByRole('button', { name: 'Open recycle bin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recycle Bin', exact: true })).toBeVisible();
  expect(fixture.undoRequests).toEqual([]);
});

for (const invalidReceipt of [
  null,
  {
    resourceType: 'department',
    id: 999,
    expectedDeletedTimeUtc: 1,
    undoExpiresTimeUtc: 15_001,
    serverTimeUtc: 1,
  },
]) {
  test(`a malformed deletion receipt (${invalidReceipt === null ? 'missing' : 'wrong record'}) never creates an undo action`, async ({
    page,
  }) => {
    const fixture = await installDeleteUndoFixture(page);
    await page.route('**/api/v1/admin/system/department/deleteWithUndo', async (route) => {
      fixture.departments = [];
      await route.fulfill(fulfillOk(invalidReceipt));
    });
    await page.goto('/#/admin/system/department');
    await submitDeletion(page);
    await expect(toast(page)).toContainText(/unknown|could not.*confirm/i);
    await expect(page.getByRole('button', { name: 'Undo deletion', exact: true })).toHaveCount(0);
    expect(fixture.deleteRequests).toHaveLength(1);
    expect(fixture.undoRequests).toEqual([]);
  });
}

test('a malformed successful undo response cannot be advertised as a confirmed restore', async ({
  page,
}) => {
  const fixture = await installDeleteUndoFixture(page);
  await page.route(undoUrl, (route) => route.fulfill(fulfillOk(999)));
  await page.goto('/#/admin/system/department');
  await deleteDepartment(page);
  await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expect(toast(page)).toContainText(/result.*unknown|could not be confirmed/i);
  await expect(toast(page)).not.toContainText('Deletion undone');
  expect(fixture.undoRequests).toHaveLength(1);
  expect(fixture.departments).toEqual([]);
});

for (const closeTiming of ['pending', 'after-refresh-failure']) {
  test(`closing the ${closeTiming} toast leaves a working list reload action`, async ({ page }) => {
    const fixture = await installDeleteUndoFixture(page);
    const gate = deferred();
    let failRefresh = false;
    await page.route(undoUrl, async (route) => {
      const request = route.request().postDataJSON() as UndoRequest;
      fixture.restore(request.id);
      failRefresh = true;
      if (closeTiming === 'pending') await gate.promise;
      await route.fulfill(fulfillOk(request.id));
    });
    await page.route(listUrl, async (route) => {
      if (failRefresh)
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, message: 'Fixture list unavailable' }),
        });
      else await route.fallback();
    });
    await page.goto('/#/admin/system/department');
    await deleteDepartment(page);
    await expect(page.getByRole('main').getByText('No data', { exact: true })).toBeVisible();
    await toast(page).getByRole('button', { name: 'Undo deletion', exact: true }).click();
    if (closeTiming === 'pending') {
      await expect(
        toast(page).getByRole('button', { name: 'Undoing…', exact: true }),
      ).toBeDisabled();
    } else {
      await expect(toast(page)).toContainText('Deletion undone');
      await expect(toast(page).getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
    }
    await toast(page).getByRole('button', { name: 'Close', exact: true }).click();
    await expect(toast(page)).toHaveCount(0);
    gate.release();
    const reload = page
      .getByRole('main')
      .getByRole('button', { name: 'Reload department list', exact: true });
    await expect(reload).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('main').getByText('No data', { exact: true })).toHaveCount(0);
    failRefresh = false;
    await reload.click();
    await expect(page.getByRole('treeitem')).toContainText(departmentName);
    expect(fixture.deleteRequests).toHaveLength(1);
    expect(fixture.undoRequests).toHaveLength(1);
    expect(fixture.base.unexpectedRequests).toEqual([]);
  });
}

test('Chinese deletion and undo notices use translated messages and actions', async ({
  page,
}, testInfo) => {
  const name = '测试撤销部门';
  const fixture = await installDeleteUndoFixture(page, {
    langCode: 'zh-CN',
    departments: [undoDepartment(1, { name })],
    permissions: ['admin.system.department:read', 'admin.system.department:delete'],
  });
  await page.goto('/#/admin/system/department');
  await page
    .getByRole('treeitem')
    .filter({ hasText: name })
    .getByRole('button', { name: '删除', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
  await expect(toast(page, name)).toContainText('已删除');
  await expect(toast(page, name)).toContainText(/剩余.*秒/);
  await expect(toast(page, name)).not.toContainText('deleteUndo.');
  await expect(
    toast(page, name).getByRole('button', { name: '撤销删除', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath('department-undo-toast-zh.png'),
    fullPage: true,
  });
  await toast(page, name).getByRole('button', { name: '撤销删除', exact: true }).click();
  await expect(toast(page, name)).toContainText('已撤销删除');
  await expect(page.getByRole('treeitem')).toContainText(name);
  expect(fixture.undoRequests).toHaveLength(1);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});
