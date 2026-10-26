import { expect, test, type Page } from '@playwright/test';
import {
  fixtureBrowserKey,
  installTiandituFixture,
  nextFixtureBrowserKey,
} from '../fixtures/tianditu/fixture.js';
import { readE2EEnvironment } from '../support/test-environment.js';

test.skip(!readE2EEnvironment().mockAuth, 'This suite only uses isolated API and tile fixtures.');

const map = (page: Page) => page.getByTestId('tianditu-map');
const ready = (page: Page) => expect(map(page)).toHaveAttribute('data-map-state', 'ready');
const globalErrors = (page: Page) =>
  page.locator('#global-snackbar-container .MuiAlert-colorError');

async function clearLogin(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('userInfo');
    localStorage.setItem('hodor:auth-session', 'fixture-logged-out');
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
}

test('home does not request map configuration or tiles until a logged-in user opens the workspace', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  const open = page.getByRole('link', { name: 'Open map', exact: true });
  await expect(open).toHaveAttribute('href', '#/home?view=map');
  expect(fixture.configRequests).toHaveLength(0);
  expect(fixture.tileRequests).toHaveLength(0);
  await open.click();
  await ready(page);
  expect(fixture.events[0]).toBe('config');
  expect(fixture.configRequests).toEqual([{ method: 'POST', body: {}, authenticated: true }]);
  expect(fixture.tileRequests.length).toBeGreaterThan(0);
  expect(fixture.tileRequests.every((request) => request.https)).toBe(true);
  expect(new Set(fixture.tileRequests.map((request) => request.layer))).toEqual(
    new Set(['vec', 'cva']),
  );
  expect(fixture.home.overviewRequests).toHaveLength(0);
  await expect(globalErrors(page)).toHaveCount(0);
});

test('a direct map URL works for a regular logged-in user without Cloudflare or map RBAC permissions', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page, { permissions: [] });
  await page.goto('/#/home?view=map');
  await ready(page);
  await expect(page.getByRole('region', { name: 'Map canvas', exact: true })).toBeVisible();
  expect(fixture.home.overviewRequests).toHaveLength(0);
  expect(fixture.configRequests).toHaveLength(1);
  expect(
    await page.evaluate(
      (key) =>
        [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
          value.includes(key),
        ),
      fixtureBrowserKey,
    ),
  ).toBe(false);
});

test('a 320px home header wraps all authorized actions without preloading the map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const fixture = await installTiandituFixture(page, {
    permissions: [
      'admin.maintenance.cloudflare_usage:read',
      'admin.maintenance.cloudflare_usage:update',
      'admin.ai.chat:read',
    ],
  });
  await page.goto('/#/home');
  await expect(page.getByTestId('usage-summary')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open map', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open AI chat', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request refresh', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  expect(fixture.configRequests).toHaveLength(0);
  expect(fixture.tileRequests).toHaveLength(0);
  await page.getByRole('link', { name: 'View usage details', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Request refresh', exact: true })).toBeVisible();
  expect(fixture.configRequests).toHaveLength(0);
  expect(fixture.tileRequests).toHaveLength(0);
});

test('unconfigured or invalid configuration never starts a map or sends a provider request', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page, {
    configuration: { configured: false, browserKey: null },
  });
  await page.goto('/#/home?view=map');
  await expect(map(page)).toHaveAttribute('data-map-state', 'not-configured');
  expect(fixture.tileRequests).toHaveLength(0);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  fixture.configuration = { configured: true, browserKey: 'invalid-browser-key' };
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(map(page)).toHaveAttribute('data-map-state', 'config-error');
  expect(fixture.configRequests).toHaveLength(2);
  expect(fixture.tileRequests).toHaveLength(0);
});

for (const failure of ['http', 'business'] as const) {
  test(`${failure} configuration failure stays local once and a manual retry refetches configuration`, async ({
    page,
  }) => {
    const fixture = await installTiandituFixture(page);
    fixture.configFailure = failure;
    await page.goto('/#/home?view=map');
    await expect(map(page)).toHaveAttribute('data-map-state', 'config-error');
    const localError = page
      .getByRole('alert')
      .filter({ hasText: 'Could not load map configuration. Please retry.' });
    await expect(localError).toHaveCount(1);
    await expect(globalErrors(page)).toHaveCount(0);
    expect(fixture.tileRequests).toHaveLength(0);
    fixture.configFailure = null;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await ready(page);
    expect(fixture.configRequests).toHaveLength(2);
    await expect(localError).toHaveCount(0);
  });
}

test('annotation tiles do not report success before at least one base tile loads', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  fixture.delayBase = true;
  try {
    await page.goto('/#/home?view=map');
    await expect
      .poll(() => fixture.tileRequests.filter((tile) => tile.layer === 'cva').length)
      .toBeGreaterThan(0);
    await expect(page.locator('.leaflet-tile-loaded')).not.toHaveCount(0);
    await expect(map(page)).toHaveAttribute('data-map-state', 'tiles-loading');
    fixture.releaseBase();
    await ready(page);
  } finally {
    fixture.releaseAll();
  }
});

test('returning home cancels a pending configuration and discards its late response', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  fixture.delayConfig = true;
  try {
    await page.goto('/#/home?view=map');
    await expect.poll(() => fixture.configRequests.length).toBe(1);
    await page.getByRole('link', { name: 'Back to home', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
    fixture.releaseConfig();
    await expect(map(page)).toHaveCount(0);
    expect(fixture.tileRequests).toHaveLength(0);
    fixture.delayConfig = false;
    await page.getByRole('link', { name: 'Open map', exact: true }).click();
    await ready(page);
    expect(fixture.configRequests).toHaveLength(2);
  } finally {
    fixture.releaseAll();
  }
});

test('a new identity revision cannot consume a pending response belonging to the previous session', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  fixture.delayConfig = true;
  fixture.configurationByRequest = [
    { configured: true, browserKey: fixtureBrowserKey },
    { configured: true, browserKey: nextFixtureBrowserKey },
  ];
  try {
    await page.goto('/#/home?view=map');
    await expect.poll(() => fixture.configRequests.length).toBe(1);
    await page.evaluate(() => {
      localStorage.setItem('hodor:auth-session', 'fixture-map-new-revision');
      window.dispatchEvent(new Event('hodor:auth-changed'));
    });
    await expect.poll(() => fixture.configRequests.length).toBe(2);
    fixture.releaseConfig();
    await ready(page);
    expect(fixture.tileRequests.length).toBeGreaterThan(0);
    expect(fixture.tileRequests.every((request) => request.key === nextFixtureBrowserKey)).toBe(
      true,
    );
  } finally {
    fixture.releaseAll();
  }
});

test('logout destroys active map elements and anonymous navigation cannot request configuration', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  await page.goto('/#/home?view=map');
  await ready(page);
  await clearLogin(page);
  await expect(map(page)).toHaveCount(0);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  const configRequestsAfterLogout = fixture.configRequests.length;
  const tilesAfterLogout = fixture.tileRequests.length;
  await page.evaluate(() => {
    window.location.hash = '/home?view=map&attempt=anonymous';
  });
  await expect(map(page)).toHaveCount(0);
  expect(fixture.configRequests).toHaveLength(configRequestsAfterLogout);
  expect(fixture.tileRequests).toHaveLength(tilesAfterLogout);
});

test('switching basemaps replaces both base and annotation layers without losing attribution', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  await page.goto('/#/home?view=map');
  await ready(page);
  await page.getByRole('button', { name: 'Satellite', exact: true }).click();
  await ready(page);
  await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(fixture.tileRequests.some((request) => request.layer === 'img')).toBe(true);
  expect(fixture.tileRequests.some((request) => request.layer === 'cia')).toBe(true);
  await expect(page.locator('.leaflet-tile-container img[src*="/vec_w/"]')).toHaveCount(0);
  await expect(page.locator('.leaflet-tile-container img[src*="/cva_w/"]')).toHaveCount(0);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('天地图');
  await page.getByRole('button', { name: 'Vector map', exact: true }).click();
  await ready(page);
  await expect(page.locator('.leaflet-tile-container img[src*="/img_w/"]')).toHaveCount(0);
  await expect(page.locator('.leaflet-tile-container img[src*="/cia_w/"]')).toHaveCount(0);
});

test('base tile failures stay local and retry recreates the map after rereading configuration', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  fixture.tileFailure = true;
  await page.goto('/#/home?view=map');
  await expect(map(page)).toHaveAttribute('data-map-state', 'tile-error');
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Some map tiles could not be loaded. Please retry.' }),
  ).toHaveCount(1);
  await expect(globalErrors(page)).toHaveCount(0);
  fixture.tileFailure = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await ready(page);
  expect(fixture.configRequests).toHaveLength(2);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
});

test('a new basemap discards late failures from the previous basemap generation', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  fixture.delayBase = true;
  try {
    await page.goto('/#/home?view=map');
    await expect
      .poll(() => fixture.tileRequests.filter((tile) => tile.layer === 'vec').length)
      .toBeGreaterThan(0);
    fixture.delayBase = false;
    await page.getByRole('button', { name: 'Satellite', exact: true }).click();
    await ready(page);
    fixture.tileFailure = true;
    fixture.releaseBase();
    await expect(map(page)).toHaveAttribute('data-map-state', 'ready');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  } finally {
    fixture.releaseAll();
  }
});

test('a stalled provider times out and returning home removes map and pending tile callbacks', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installTiandituFixture(page);
  fixture.delayBase = true;
  try {
    await page.goto('/#/home?view=map');
    await expect
      .poll(() => fixture.tileRequests.filter((tile) => tile.layer === 'vec').length)
      .toBeGreaterThan(0);
    await expect(map(page)).toHaveAttribute('data-map-state', 'tiles-loading');
    await page.clock.fastForward(15_001);
    await expect(map(page)).toHaveAttribute('data-map-state', 'tile-timeout');
    await expect(page.getByRole('alert')).toHaveCount(1);
    await page.getByRole('link', { name: 'Back to home', exact: true }).click();
    fixture.releaseBase();
    await expect(map(page)).toHaveCount(0);
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    await page.clock.fastForward(20_000);
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {
    fixture.releaseAll();
  }
});

test('a failed reconfiguration cannot reuse the previous successful session key', async ({
  page,
}) => {
  const fixture = await installTiandituFixture(page);
  await page.goto('/#/home?view=map');
  await ready(page);
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(map(page)).toHaveCount(0);
  const previousTiles = fixture.tileRequests.length;
  fixture.configuration = { configured: false, browserKey: null };
  await page.getByRole('link', { name: 'Open map', exact: true }).click();
  await expect(map(page)).toHaveAttribute('data-map-state', 'not-configured');
  expect(fixture.configRequests).toHaveLength(2);
  expect(fixture.tileRequests).toHaveLength(previousTiles);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
});

test('a completed viewport change stays ready after the next tile timeout interval', async ({
  page,
}) => {
  await page.clock.install();
  const fixture = await installTiandituFixture(page);
  await page.goto('/#/home?view=map');
  await ready(page);
  const canvas = page.getByRole('region', { name: 'Map canvas', exact: true });
  const previousTiles = fixture.tileRequests.length;
  await canvas.press('ArrowRight');
  await canvas.press('Shift+Equal');
  await page.clock.runFor(500);
  await expect.poll(() => fixture.tileRequests.length).toBeGreaterThan(previousTiles);
  await ready(page);
  await expect
    .poll(() =>
      page
        .locator('.leaflet-tile')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.clock.fastForward(15_001);
  await ready(page);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('keyboard controls and narrow Chinese dark layout stay inside the page', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = await installTiandituFixture(page, { langCode: 'zh-CN' });
  await page.goto('/#/home?view=map');
  await ready(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.getByRole('button', { name: '卫星影像', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '卫星影像', exact: true }).press('Enter');
  await ready(page);
  const canvas = page.getByRole('region', { name: '地图画布', exact: true });
  const initialZoom = Math.max(...fixture.tileRequests.map((request) => request.zoom));
  await canvas.press('ArrowRight');
  await expect(canvas).toBeFocused();
  await canvas.press('Shift+Equal');
  await expect
    .poll(() => Math.max(...fixture.tileRequests.map((request) => request.zoom)))
    .toBeGreaterThan(initialZoom);
  await page.getByRole('button', { name: '初始视野', exact: true }).press('Enter');
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.locator('#global-snackbar-container [role="alert"]')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('tianditu-mobile-zh-dark.png'),
    fullPage: true,
  });
});
