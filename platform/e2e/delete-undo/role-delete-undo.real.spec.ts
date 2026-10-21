import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page, type Response } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';

interface IsolatedRoleConfiguration {
  backendOrigin: string;
  user: { id: number; username: string; token: string; langCode: 'en-US' };
  totpSecret: string;
  role: { id: number; name: string };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readConfiguration(): IsolatedRoleConfiguration | null {
  const file = process.env.HODOR_E2E_ROLE_REAL_CONFIG;
  if (!file) return null;
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (
    !isObject(value) ||
    typeof value.backendOrigin !== 'string' ||
    !isObject(value.user) ||
    !Number.isSafeInteger(value.user.id) ||
    typeof value.user.username !== 'string' ||
    typeof value.user.token !== 'string' ||
    value.user.langCode !== 'en-US' ||
    typeof value.totpSecret !== 'string' ||
    !isObject(value.role) ||
    !Number.isSafeInteger(value.role.id) ||
    typeof value.role.name !== 'string'
  )
    throw new Error('The isolated role browser configuration is invalid');
  const origin = new URL(value.backendOrigin);
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname))
    throw new Error('Real role browser acceptance only permits a loopback backend');
  const frontend = new URL(readE2EEnvironment().baseUrl);
  if (
    frontend.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(frontend.hostname)
  )
    throw new Error('Real role browser acceptance only permits a loopback frontend');
  return {
    backendOrigin: origin.origin,
    user: {
      id: Number(value.user.id),
      username: value.user.username,
      token: value.user.token,
      langCode: 'en-US',
    },
    totpSecret: value.totpSecret,
    role: { id: Number(value.role.id), name: value.role.name },
  };
}

/** Normal RFC 6238 verification using a disposable fixture secret, never a production bypass. */
function totpCode(secret: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret.replace(/=+$/u, '').toUpperCase()]
    .map((character) => {
      const value = alphabet.indexOf(character);
      if (value < 0) throw new Error('Invalid fixture Base32 secret');
      return value.toString(2).padStart(5, '0');
    })
    .join('');
  const key = Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, index) =>
      parseInt(bits.slice(index * 8, index * 8 + 8), 2),
    ),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

async function expectSuccess(response: Response, id?: number): Promise<unknown> {
  expect(response.status()).toBe(200);
  const body: unknown = await response.json();
  expect(isObject(body) && body.ok === true).toBe(true);
  if (!isObject(body)) throw new Error('The real API returned an invalid response');
  if (id !== undefined) expect(body.data).toBe(id);
  return body.data;
}

const configuration = readConfiguration();
test.skip(
  !configuration,
  'Set HODOR_E2E_ROLE_REAL_CONFIG to a disposable loopback Node or Worker fixture.',
);
test.use({ storageState: { cookies: [], origins: [] } });

test('real role browser: normal TOTP, delete, undo, and recycle-bin restore', async ({
  page,
}, testInfo) => {
  if (!configuration) throw new Error('Missing isolated role configuration');
  test.setTimeout(90_000);
  const config = configuration;
  const businessPaths: string[] = [];
  await page.addInitScript((user) => {
    localStorage.setItem('userInfo', JSON.stringify(user));
    sessionStorage.setItem('chunk_reload_attempted', '1');
  }, config.user);
  await page.route(/\/(enterprise|personal)\/remoteEntry\.js$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export const init = () => {}; export const get = async () => () => ({ default: () => null });',
    }),
  );
  // Every API response is fetched from the real isolated server. No API fixture is installed.
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const source = new URL(request.url());
    const target = new URL(source.pathname + source.search, config.backendOrigin);
    businessPaths.push(source.pathname);
    const response = await route.fetch({ url: target.href, maxRedirects: 0 });
    await route.fulfill({ response });
  });
  const recordRow = (view: Page) => view.getByRole('row').filter({ hasText: config.role.name });
  const notice = page.getByRole('alert').filter({ hasText: config.role.name });
  await page.goto('/#/admin/system/role');
  await expect(
    page.getByRole('heading', { name: 'Security verification', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Authenticator code', { exact: true }).fill(totpCode(config.totpSecret));
  const verification = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/auth/gate/verify'),
  );
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await expectSuccess(await verification);
  await expect(recordRow(page)).toBeVisible();

  async function deleteRecord() {
    await recordRow(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('30 days');
    const response = page.waitForResponse((result) =>
      new URL(result.url()).pathname.endsWith('/role/deleteWithUndo'),
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    const receipt = await expectSuccess(await response);
    if (!isObject(receipt)) throw new Error('The real server returned no deletion receipt');
    expect(receipt.resourceType).toBe('role');
    expect(receipt.id).toBe(config.role.id);
    await expect(recordRow(page)).toHaveCount(0);
    await expect(notice.getByRole('button', { name: 'Undo deletion', exact: true })).toBeEnabled();
    return receipt;
  }

  await deleteRecord();
  const undo = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/recycle-bin/undo'),
  );
  await notice.getByRole('button', { name: 'Undo deletion', exact: true }).click();
  await expectSuccess(await undo, config.role.id);
  await expect(notice).toContainText('Deletion undone');
  await expect(recordRow(page)).toBeVisible();
  await notice.getByRole('button', { name: 'Close', exact: true }).click();

  const receipt = await deleteRecord();
  await page.evaluate(() => {
    window.location.hash = '/admin/recycle-bin';
  });
  await expect(page.getByRole('heading', { name: 'Recycle Bin', exact: true })).toBeVisible();
  const selector = page.getByRole('combobox', { name: 'Resource type' });
  if ((await selector.textContent()) !== 'Role') {
    await selector.click();
    await page.getByRole('option', { name: 'Role', exact: true }).click();
  }
  await expect(recordRow(page)).toBeVisible();
  await recordRow(page).getByRole('button', { name: 'Restore', exact: true }).click();
  const restore = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith('/recycle-bin/restore'),
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  const restored = await restore;
  const request: unknown = restored.request().postDataJSON();
  expect(request).toEqual({
    resourceType: 'role',
    id: config.role.id,
    expectedDeletedTimeUtc: receipt.expectedDeletedTimeUtc,
  });
  await expectSuccess(restored, config.role.id);
  await expect(recordRow(page)).toHaveCount(0);
  await page.evaluate(() => {
    window.location.hash = '/admin/system/role';
  });
  await expect(recordRow(page)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('real-role-restored.png'), fullPage: true });
  expect(businessPaths).toContain('/api/v1/admin/system/auth/gate/verify');
  expect(businessPaths.filter((path) => path.endsWith('/role/deleteWithUndo'))).toHaveLength(2);
  expect(businessPaths.filter((path) => path.endsWith('/recycle-bin/undo'))).toHaveLength(1);
  expect(businessPaths.filter((path) => path.endsWith('/recycle-bin/restore'))).toHaveLength(1);
});
