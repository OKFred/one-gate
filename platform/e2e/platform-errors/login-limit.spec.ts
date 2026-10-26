import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';

test.skip(
  !readE2EEnvironment().mockAuth,
  'Requires isolated API responses, never production login.',
);
test.use({ storageState: { cookies: [], origins: [] } });

const scenarios = [
  {
    name: 'D1 read quota with unavailable dynamic translations',
    status: 503,
    code: 'CLOUDFLARE_D1_DAILY_READ_LIMIT',
    message: /D1.*daily read quota/iu,
  },
  {
    name: 'HTTP 200 business rejection',
    status: 200,
    code: 'CLOUDFLARE_KV_RATE_LIMITED',
    message: /KV.*(frequen|rate|too many)/iu,
  },
  {
    name: 'untranslated unknown error from an older server',
    status: 500,
    code: null,
    message: /service|request|server/iu,
  },
  {
    name: 'Workers daily quota rejected before application execution',
    status: 429,
    code: null,
    edgeCode: '1027',
    message: /Workers.*daily request quota/iu,
  },
  {
    name: 'Workers CPU or memory limit page',
    status: 500,
    code: null,
    edgeCode: '1102',
    message: /Workers.*CPU or memory limit/iu,
  },
  {
    name: 'unreadable response does not claim a proven quota failure',
    status: 0,
    code: null,
    network: true,
    message: /network or service.*unavailable/iu,
  },
] as const;

for (const scenario of scenarios) {
  test(`login shows one actionable error: ${scenario.name}`, async ({ page }) => {
    let loginRequests = 0;
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('chunk_reload_attempted', '1');
    });
    await page.route('**/remoteEntry.js*', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: 'export const init=()=>{}; export const get=async()=>()=>({default:()=>null});',
      }),
    );
    await page.route('**/api/v1/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('/auth/login')) {
        loginRequests += 1;
        if ('network' in scenario) {
          await route.abort('failed');
          return;
        }
        if ('edgeCode' in scenario) {
          await route.fulfill({
            status: scenario.status,
            contentType: 'text/html',
            body: `<html><head><title>Cloudflare error</title></head><body><div id="cf-error-details"><h1>Error code: ${scenario.edgeCode}</h1></div></body></html>`,
          });
          return;
        }
        await route.fulfill({
          status: scenario.status,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: false,
            message: 'errorHandler.unknownError',
            data: { ...(scenario.code ? { code: scenario.code } : {}), details: [] },
          }),
        });
      } else {
        // No server-supplied translations or authentication session are available.
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, message: 'ok', data: [] }),
        });
      }
    });
    await page.goto('/#/login');
    await page.getByLabel('Username', { exact: true }).fill('quota-fixture');
    await page.getByLabel('Password', { exact: true }).fill('synthetic-only');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('alert')).toContainText(scenario.message);
    await expect(page.getByRole('alert')).not.toContainText('errorHandler.');
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/#\/login$/u);
    expect(loginRequests).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('userInfo'))).toBeNull();
  });
}
