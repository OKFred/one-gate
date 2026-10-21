import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import { recycleBinFixtureUser } from '../support/recycle-bin-fixture.js';

test.skip(!readE2EEnvironment().mockAuth, 'Requires the isolated CRUD harness.');
test.use({ storageState: { cookies: [], origins: [] } });
const origin = 'http://127.0.0.1:4176';

function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function install(page: Page) {
  const state = {
    lists: [] as { resource: string; keyword?: string }[],
    deletes: [] as { resource: string; id: number; expectedUpdateTimeUtc?: number | null }[],
    updates: [] as { resource: string; id: number }[],
    records: new Map(
      ['role', 'other', 'alpha', 'beta'].map((resource) => [
        resource,
        [{ id: 1, name: `${resource} record`, updateTimeUtc: null }],
      ]),
    ),
  };
  await page.addInitScript(
    (user) => localStorage.setItem('userInfo', JSON.stringify(user)),
    recycleBinFixtureUser,
  );
  await page.route('**/api/v1/**', (route) => route.abort('blockedbyclient'));
  await page.route('**/fixture/**', async (route) => {
    const [, , resource, operation] = new URL(route.request().url()).pathname.split('/');
    const data = route.request().postDataJSON() as {
      id: number;
      keyword?: string;
      expectedUpdateTimeUtc?: number | null;
    };
    let result: unknown;
    if (operation === 'list') {
      state.lists.push({ resource, keyword: data.keyword });
      result = state.records.get(resource) ?? [];
    } else if (operation === 'delete') {
      state.deletes.push({ resource, ...data });
      state.records.set(resource, []);
      const now = Date.now();
      result =
        resource === 'role' || resource === 'other'
          ? {
              resourceType: resource,
              id: data.id,
              expectedDeletedTimeUtc: now,
              undoExpiresTimeUtc: now + 15_000,
              serverTimeUtc: now,
            }
          : data.id;
    } else if (operation === 'update') {
      state.updates.push({ resource, id: data.id });
      result = data.id;
    } else throw new Error('Unexpected isolated harness operation');
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
  });
  return state;
}

const record = (page: Page, resource: string) =>
  page.getByRole('row', { includeHidden: true }).filter({ hasText: `${resource} record` });

async function switchResource(page: Page, resource: string) {
  // Hosts can change props while a dialog is open; this button lives only in the test harness.
  await page.getByTestId(`switch-${resource}`).evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected fixture switch button');
    button.click();
  });
}

test('changing a soft-delete resource in the same mounted CRUD instance clears the old confirmation and defaults', async ({
  page,
}) => {
  const state = await install(page);
  await page.goto(origin);
  await expect(record(page, 'role')).toBeVisible();
  const instance = await page.getByTestId('instance').textContent();
  await record(page, 'role').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('role confirmation');
  await switchResource(page, 'other');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(record(page, 'role')).toHaveCount(0);
  await expect(record(page, 'other')).toBeVisible();
  expect(await page.getByTestId('instance').textContent()).toBe(instance);
  expect(state.lists.at(-1)).toEqual({ resource: 'other', keyword: 'other' });
  await record(page, 'other').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('other confirmation');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect
    .poll(() => state.deletes)
    .toEqual([{ resource: 'other', id: 1, expectedUpdateTimeUtc: null }]);
});

test('an older resource query cannot overwrite the newer resource or its default filters', async ({
  page,
}) => {
  const state = await install(page);
  const gate = deferred();
  let started = false;
  await page.route('**/fixture/role/list', async (route) => {
    started = true;
    await gate.promise;
    await route.fallback();
  });
  await page.goto(origin);
  await expect.poll(() => started).toBe(true);
  await switchResource(page, 'other');
  await expect(record(page, 'other')).toBeVisible();
  gate.release();
  await expect.poll(() => state.lists.length).toBe(2);
  await expect(record(page, 'role')).toHaveCount(0);
  await expect(record(page, 'other')).toBeVisible();
  expect(state.lists.find((request) => request.resource === 'other')?.keyword).toBe('other');
});

test('a late old-resource delete only handles its original receipt and leaves the new dialog open', async ({
  page,
}) => {
  const state = await install(page);
  const gate = deferred();
  let started = false;
  await page.route('**/fixture/role/delete', async (route) => {
    started = true;
    await gate.promise;
    await route.fallback();
  });
  await page.goto(origin);
  await record(page, 'role').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await switchResource(page, 'other');
  await expect(record(page, 'other')).toBeVisible();
  await record(page, 'other').getByRole('button', { name: 'Delete', exact: true }).click();
  gate.release();
  await expect(page.getByRole('alert').filter({ hasText: 'role record' })).toContainText('Deleted');
  await expect(page.getByRole('dialog')).toContainText('other confirmation');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }),
  ).toBeEnabled();
  await expect(record(page, 'other')).toBeVisible();
  expect(state.deletes).toEqual([{ resource: 'role', id: 1, expectedUpdateTimeUtc: null }]);
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(() => state.deletes.length).toBe(2);
  expect(state.deletes[1]).toEqual({ resource: 'other', id: 1, expectedUpdateTimeUtc: null });
});

test('ordinary CRUD resources use explicit resourceKey without changing their delete contract', async ({
  page,
}) => {
  const state = await install(page);
  await page.goto(origin);
  await switchResource(page, 'alpha');
  await record(page, 'alpha').getByRole('button', { name: 'Delete', exact: true }).click();
  await switchResource(page, 'beta');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(record(page, 'beta')).toBeVisible();
  await record(page, 'beta').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toContainText('30 days');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(() => state.deletes).toEqual([{ resource: 'beta', id: 1 }]);
});

test('resource changes clear the old form and a late old update cannot close the new form', async ({
  page,
}) => {
  const state = await install(page);
  const gate = deferred();
  let started = false;
  await page.route('**/fixture/role/update', async (route) => {
    started = true;
    await gate.promise;
    await route.fallback();
  });
  await page.goto(origin);
  await record(page, 'role').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Record name')).toHaveValue('role record');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await switchResource(page, 'other');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await record(page, 'other').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Record name')).toHaveValue('other record');
  gate.release();
  await expect.poll(() => state.updates).toEqual([{ resource: 'role', id: 1 }]);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Record name')).toHaveValue('other record');
});

test('returning to the same resource does not let an earlier update close its new form', async ({
  page,
}) => {
  const state = await install(page);
  const gate = deferred();
  let started = false;
  await page.route('**/fixture/role/update', async (route) => {
    started = true;
    await gate.promise;
    await route.fallback();
  });
  await page.goto(origin);
  await record(page, 'role').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await switchResource(page, 'other');
  await expect(record(page, 'other')).toBeVisible();
  await switchResource(page, 'role');
  await record(page, 'role').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Record name').fill('New role draft');
  gate.release();
  await expect.poll(() => state.updates).toEqual([{ resource: 'role', id: 1 }]);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Record name')).toHaveValue('New role draft');
});

test('new config object references for the same semantic resource do not reload or reset the form', async ({
  page,
}) => {
  const state = await install(page);
  await page.goto(origin);
  await expect(record(page, 'role')).toBeVisible();
  await record(page, 'role').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Record name').fill('Unsaved draft');
  const queries = state.lists.length;
  await page.getByTestId('rerender').evaluate((button) => {
    if (button instanceof HTMLButtonElement) button.click();
  });
  await expect(page.getByTestId('revision')).toHaveText('1');
  await expect(page.getByLabel('Record name')).toHaveValue('Unsaved draft');
  expect(state.lists).toHaveLength(queries);
});
