import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  fulfillOk,
  installCloudflareHomeFixture,
  usageFixtureNow,
  usageOverview,
} from '../support/cloudflare-home-fixture.js';

test.skip(!readE2EEnvironment().mockAuth, 'This suite only uses isolated API fixtures.');

test('home keeps only three priority rows and links to all usage details', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = usageOverview();
  overview.metrics.push(
    { ...overview.metrics[0], id: 'kv', product: 'KV', name: 'KV read', percentage: 90, used: 90 },
    {
      ...overview.metrics[0],
      id: 'queues',
      product: 'Queues',
      name: 'Operations',
      percentage: 85,
      used: 85,
    },
  );
  const fixture = await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home');
  const summary = page.getByTestId('usage-summary');
  const rows = page.getByTestId('usage-summary-row');
  await expect(summary).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('D1');
  await expect(rows.nth(1)).toContainText('Workers AI');
  await expect(rows.nth(2)).toContainText('KV');
  await expect(rows.filter({ hasText: 'Unknown storage' })).toHaveCount(0);
  await expect(rows.filter({ hasText: 'Workers · Requests' })).toHaveCount(0);
  await expect(summary.getByText('5 need attention', { exact: true })).toBeVisible();
  await expect(summary.getByText('3 charge groups', { exact: true })).toBeVisible();
  await expect(page.getByTestId('usage-trend')).toHaveCount(0);
  await expect(page.getByTestId('usage-card')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^(1 day|3 days|7 days|30 days)$/u })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Request refresh', exact: true })).toHaveCount(0);
  await expect(page.getByText('Billing Read permission missing', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Billing range is not covered', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open AI chat', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open map', exact: true })).toBeVisible();
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('home-simple-light.png'), fullPage: true });
  await page.getByRole('link', { name: 'View usage details', exact: true }).press('Enter');
  await expect(page).toHaveURL(/#\/home\?view=usage$/u);
  await expect(page.getByTestId('usage-card')).toHaveCount(6);
  await expect(page.getByTestId('usage-card').filter({ hasText: 'Unknown storage' })).toBeVisible();
  await expect(page.getByTestId('usage-trend')).toHaveCount(1);
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(7);
});

test('a single verified charge group retains its exact monetary total on the summary', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = usageOverview();
  overview.costs = overview.costs.filter((cost) => ['usd-workers', 'usd-d1'].includes(cost.id));
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home');
  await expect(
    page.getByTestId('usage-summary').getByText('USD 0.30', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('usage-cost-group')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Charge details', exact: true })).toHaveCount(0);
});

for (const state of ['unknown', 'stale', 'partial', 'failed'] as const) {
  test(`summary exposes ${state} data without a blanket normal or zero-usage claim`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(usageFixtureNow));
    const overview = usageOverview();
    overview.metrics = [{ ...overview.metrics[0], used: 10, remaining: 90, percentage: 10 }];
    overview.coverage = [];
    overview.sync.state = 'complete';
    overview.costs = [];
    let status = '';
    if (state === 'unknown') {
      overview.metrics[0] = {
        ...overview.metrics[0],
        used: null,
        limit: null,
        remaining: null,
        percentage: null,
        quotaKind: 'unknown',
        quality: 'unknown',
        status: 'unknown',
      };
      status = 'Some data needs verification';
    } else if (state === 'stale') {
      overview.metrics[0].status = 'stale';
      status = 'Stale data';
    } else if (state === 'partial') {
      overview.coverage = [
        { product: 'Billing', status: 'forbidden', reason: 'Hidden diagnostics' },
      ];
      overview.sync.state = 'partial';
      status = 'Some data unavailable';
    } else {
      overview.sync.state = 'failed';
      status = 'Collection failed';
    }
    await installCloudflareHomeFixture(page, { overview });
    await page.goto('/#/home');
    const summary = page.getByTestId('usage-summary');
    await expect(page.getByTestId('usage-summary-status')).toHaveText(status);
    await expect(summary).not.toContainText(/all normal|all healthy|zero usage/iu);
    await expect(summary.getByText('0%', { exact: true })).toHaveCount(0);
    await expect(summary.getByText('Unavailable', { exact: true })).toBeVisible();
    await expect(page.getByText('Hidden diagnostics', { exact: true })).toHaveCount(0);
    if (state === 'unknown') {
      await expect(page.getByTestId('usage-summary-row')).toContainText('Unknown quota');
      await expect(page.getByTestId('usage-summary-row').getByRole('progressbar')).toHaveCount(0);
    }
    if (state === 'stale') {
      await expect(page.getByTestId('usage-summary-row')).toContainText('Stale data');
    }
  });
}

test('summary metric navigation selects its detail and returning restores the small request window', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const fixture = await installCloudflareHomeFixture(page);
  await page.goto('/#/home');
  await page.getByRole('link', { name: 'View trend: Rows', exact: true }).click();
  await expect(page.getByRole('combobox')).toContainText('D1');
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(7);
  await page.getByRole('button', { name: '3 days', exact: true }).click();
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(3);
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/u);
  await expect(page.getByTestId('usage-summary')).toBeVisible();
  await expect(page.getByTestId('usage-trend')).toHaveCount(0);
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(1);
});

test('summary keeps estimated, reference and unknown-consumption observations honest', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = usageOverview();
  const metric = overview.metrics[0];
  overview.metrics = [
    {
      ...metric,
      id: 'estimated',
      name: 'Estimated requests',
      used: 20,
      remaining: 80,
      percentage: 20,
      quality: 'estimated',
    },
    {
      ...metric,
      id: 'reference',
      name: 'Reference requests',
      used: 40,
      remaining: 60,
      percentage: 40,
      quality: 'reference',
    },
    {
      ...metric,
      id: 'unknown-used',
      name: 'Unknown consumption',
      used: null,
      remaining: null,
      percentage: 80,
    },
  ];
  overview.coverage = [];
  overview.sync.state = 'complete';
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home');
  const rows = page.getByTestId('usage-summary-row');
  const estimated = rows.filter({ hasText: 'Estimated requests' });
  const reference = rows.filter({ hasText: 'Reference requests' });
  const unknown = rows.filter({ hasText: 'Unknown consumption' });
  await expect(estimated).toContainText(/≈\s*20 requests/u);
  await expect(estimated.getByText(/≈\s*20%/u)).toBeVisible();
  await expect(reference).toContainText(/40 requests\s*·\s*Reference/u);
  await expect(reference.getByRole('progressbar')).toHaveCount(0);
  await expect(reference.getByText(/40%/u)).toHaveCount(0);
  await expect(unknown.getByText('Unknown', { exact: true })).toBeVisible();
  await expect(unknown.getByText('Unknown quota', { exact: true })).toHaveCount(0);
  await expect(unknown.getByRole('progressbar')).toHaveCount(0);
  await expect(unknown.getByText('80%', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('usage-summary-status')).toHaveText('Some data needs verification');
});

test('browser back to the summary clears the detail dialog before revisiting usage', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page);
  await page.goto('/#/home');
  await page.getByRole('link', { name: 'View usage details', exact: true }).click();
  await page.getByRole('button', { name: 'View details: Requests', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /^Metric details/u })).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('usage-summary')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'View usage details', exact: true }).click();
  await expect(page.getByTestId('usage-card')).toHaveCount(4);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a late detail response cannot overwrite the newer summary snapshot', async ({ page }) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const fixture = await installCloudflareHomeFixture(page);
  let release = () => {};
  let detailStarted = false;
  let detailFinished = false;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const obsolete = usageOverview();
  obsolete.metrics = [{ ...obsolete.metrics[0], name: 'Obsolete pending metric' }];
  await page.route('**/api/v1/admin/maintenance/cloudflare-usage/overview', async (route) => {
    const body = route.request().postDataJSON() as { days?: number };
    if (body.days !== 7) {
      await route.fallback();
      return;
    }
    detailStarted = true;
    await pending;
    await route.fulfill(fulfillOk(obsolete));
    detailFinished = true;
  });
  await page.goto('/#/home');
  await expect(page.getByTestId('usage-summary')).toBeVisible();
  await page.getByRole('link', { name: 'View usage details', exact: true }).click();
  await expect.poll(() => detailStarted).toBe(true);
  fixture.overview.metrics = [
    { ...fixture.overview.metrics[0], used: 10, remaining: 90, percentage: 10 },
  ];
  await page.getByRole('link', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('usage-summary-row')).toHaveCount(1);
  await expect(page.getByTestId('usage-summary-row')).toContainText('10%');
  release();
  await expect.poll(() => detailFinished).toBe(true);
  await expect(page.getByText('Obsolete pending metric', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('usage-summary-row')).toContainText('10%');
});

test('Chinese dark summary fits a 320px viewport and keeps secondary content off the homepage', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await installCloudflareHomeFixture(page, { langCode: 'zh-CN' });
  await page.goto('/#/home');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('usage-summary')).toBeVisible();
  await expect(page.getByTestId('usage-summary-row')).toHaveCount(3);
  await expect(page.getByRole('link', { name: '查看详情', exact: true })).toBeVisible();
  await expect(page.getByTestId('usage-trend')).toHaveCount(0);
  await expect(page.getByTestId('usage-card')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(1200);
  await page.screenshot({
    path: testInfo.outputPath('home-simple-dark-mobile.png'),
    fullPage: true,
  });
});
