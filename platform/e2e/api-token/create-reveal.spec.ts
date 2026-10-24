import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  fixtureCreateError,
  fixtureRawToken,
  installApiTokenFixture,
} from '../support/api-token-fixture.js';

const environment = readE2EEnvironment();
const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(
  new URL(environment.baseUrl).hostname,
);
test.skip(
  !environment.mockAuth || !localPreview,
  'Requires the isolated mock-auth fixture and a local preview URL.',
);
test.use({ storageState: { cookies: [], origins: [] } });

const tokenName = 'Fixture collector token';
const expectedCreateRequest = {
  name: tokenName,
  permissions: '[]',
  ipWhitelist: null,
  startTimeUtc: null,
  expireTimeUtc: null,
  remark: null,
};
const tokenDialog = (page: Page) => page.getByRole('dialog', { name: 'API Token Created' });

async function openCreateForm(page: Page) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Token Name', { exact: false }).fill(tokenName);
  return dialog;
}

async function finishBrowserUpdate(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test('nested successful creation reveals the token once and closing clears it', async ({
  page,
}) => {
  const fixture = await installApiTokenFixture(page);
  await page.goto('/#/admin/system/api-token');
  const form = await openCreateForm(page);
  await form.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(tokenDialog(page)).toBeVisible();
  await expect(tokenDialog(page)).toContainText(
    'This is the ONLY time this token will be displayed.',
  );
  await expect(page.getByText(fixtureRawToken, { exact: true })).toHaveCount(1);
  expect(fixture.createRequests).toEqual([expectedCreateRequest]);
  expect(fixture.writes).toEqual([{ operation: 'add', data: expectedCreateRequest }]);

  await tokenDialog(page).getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(tokenDialog(page)).toHaveCount(0);
  await expect(page.getByText(fixtureRawToken, { exact: true })).toHaveCount(0);
  const row = page.getByRole('row').filter({ hasText: tokenName });
  await expect(row).toContainText(`${fixtureRawToken.slice(0, 12)}••••`);

  await openCreateForm(page);
  await expect(tokenDialog(page)).toHaveCount(0);
  await expect(page.getByText(fixtureRawToken, { exact: true })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: tokenName })).toBeVisible();
  await expect(tokenDialog(page)).toHaveCount(0);
  await expect(page.getByText(fixtureRawToken, { exact: true })).toHaveCount(0);
  expect(fixture.createRequests).toHaveLength(1);
  expect(fixture.writes).toEqual([{ operation: 'add', data: expectedCreateRequest }]);
  expect(fixture.base.unexpectedRequests).toEqual([]);
});

for (const failureStatus of [200, 503] as const) {
  test(`creation failure with HTTP ${failureStatus} never reveals a token or retries the write`, async ({
    page,
  }) => {
    const fixture = await installApiTokenFixture(page, { failureStatus });
    await page.goto('/#/admin/system/api-token');
    const form = await openCreateForm(page);
    await form.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('alert').filter({ hasText: fixtureCreateError })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await finishBrowserUpdate(page);
    await expect(tokenDialog(page)).toHaveCount(0);
    await expect(page.getByText(fixtureRawToken, { exact: true })).toHaveCount(0);
    expect(fixture.rows).toEqual([]);
    expect(fixture.createRequests).toEqual([expectedCreateRequest]);
    expect(fixture.writes).toEqual([{ operation: 'add', data: expectedCreateRequest }]);

    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await finishBrowserUpdate(page);
    expect(fixture.createRequests).toHaveLength(1);
    expect(fixture.base.unexpectedRequests).toEqual([]);
  });
}
