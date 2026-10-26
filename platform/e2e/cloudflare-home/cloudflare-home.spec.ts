import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  fulfillOk,
  capacityUsageOverview,
  cumulativeUsageOverview,
  dailyUsageOverview,
  installCloudflareHomeFixture,
  usageFixtureNow,
  usageOverview,
  type ChatRequest,
  type UsageDays,
} from '../support/cloudflare-home-fixture.js';

test.skip(!readE2EEnvironment().mockAuth, 'This suite only uses isolated API fixtures.');

async function chooseUsageRange(page: Page, days: UsageDays) {
  const response = page.waitForResponse((result) => {
    if (
      !result.url().endsWith('/cloudflare-usage/overview') ||
      result.request().method() !== 'POST'
    )
      return false;
    const payload: unknown = result.request().postDataJSON();
    return (
      typeof payload === 'object' && payload !== null && 'days' in payload && payload.days === days
    );
  });
  await page
    .getByRole('button', { name: `${days} ${days === 1 ? 'day' : 'days'}`, exact: true })
    .click();
  await response;
  await expect(page.getByRole('progressbar', { name: 'Loading usage snapshot' })).toBeHidden();
}

test('chat uses its own catalog permission, sends the selected model and excludes the current question from history', async ({
  page,
}) => {
  const fixture = await installCloudflareHomeFixture(page, { permissions: ['admin.ai.chat:read'] });
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByRole('combobox')).toHaveText('Fixture text');
  const input = page.getByPlaceholder(/Type your question/);
  await input.fill('first question');
  await input.press('Enter');
  await expect(page.getByText('Fixture reply', { exact: true })).toBeVisible();
  expect(fixture.askRequests[0]).toEqual({
    q: 'first question',
    modelKey: 'fixture:text:r1',
    history: [],
  });
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /Fixture vision/ }).click();
  await expect(page.getByText(/manually accept the Meta license/)).toBeVisible();
  await input.fill('second question');
  await input.press('Enter');
  await expect.poll(() => fixture.askRequests.length).toBe(2);
  expect(fixture.askRequests[1]).toEqual({
    q: 'second question',
    modelKey: 'fixture:vision:r1',
    history: [
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: '**Fixture reply**' },
    ],
  });
  expect(fixture.oldModelRequests).toBe(0);
  expect(fixture.modelRequests).toBeGreaterThan(0);
});

test('retry preserves the original image, question and model snapshot after model selection changes', async ({
  page,
}, testInfo) => {
  const fixture = await installCloudflareHomeFixture(page);
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByRole('combobox')).toHaveText('Fixture text');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: /Fixture vision/ }).click();
  await page.getByTestId('chat-image-input').setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKZsAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByAltText('Image preview')).toBeVisible();
  await page.getByPlaceholder(/Type your question/).fill('inspect image');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Fixture reply', { exact: true })).toBeVisible();
  const original = fixture.askRequests[0];
  await page.screenshot({ path: testInfo.outputPath('ai-chat.png'), fullPage: true });
  expect(original.image).toMatch(/^data:image\/png;base64,/u);
  await expect(page.getByRole('button', { name: 'Attach image' })).toBeDisabled();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Fixture text', exact: true }).click();
  await page.getByRole('button', { name: 'Retry original question' }).click();
  await expect.poll(() => fixture.askRequests.length).toBe(2);
  expect(fixture.askRequests[1]).toEqual(original);
});

test('double click sends once and new conversation discards a late reply', async ({ page }) => {
  await installCloudflareHomeFixture(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route('**/api/v1/admin/ai/chat/ask', async (route) => {
    requests += 1;
    await pending;
    await route.fulfill(fulfillOk('obsolete reply'));
  });
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByRole('combobox')).toHaveText('Fixture text');
  await page.getByPlaceholder(/Type your question/).fill('pending question');
  await page
    .getByRole('button', { name: 'Send', exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => requests).toBe(1);
  await page.getByRole('button', { name: 'New Chat', exact: true }).click();
  release?.();
  await expect(page.getByText('pending question', { exact: true })).toHaveCount(0);
  await expect(page.getByText('obsolete reply', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Choose an available model and enter a question/)).toBeVisible();
});

test('invalid responses and generation failures render once outside the inference context', async ({
  page,
}) => {
  await installCloudflareHomeFixture(page);
  const requests: ChatRequest[] = [];
  await page.route('**/api/v1/admin/ai/chat/ask', async (route) => {
    requests.push(route.request().postDataJSON() as ChatRequest);
    if (requests.length === 1)
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: { unsafe: 'not a string' } }),
      });
    else if (requests.length === 2)
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Safe generation failure' }),
      });
    else await route.fulfill(fulfillOk('recovered'));
  });
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByRole('combobox')).toHaveText('Fixture text');
  const input = page.getByPlaceholder(/Type your question/);
  await input.fill('question one');
  await input.press('Enter');
  await expect(
    page.getByText('The model returned an invalid response. Please retry.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry original question' }).click();
  await expect(page.getByText('Safe generation failure', { exact: true })).toHaveCount(1);
  await expect(page.locator('#global-snackbar-container')).toHaveCount(0);
  await input.fill('question two');
  await input.press('Enter');
  await expect(page.getByText('recovered', { exact: true })).toBeVisible();
  expect(requests[2].history).toEqual([{ role: 'user', content: 'question one' }]);
});

test('homepage stays available without usage permission and sends no usage request', async ({
  page,
}) => {
  const fixture = await installCloudflareHomeFixture(page, { permissions: ['admin.ai.chat:read'] });
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open AI chat' })).toBeVisible();
  expect(fixture.overviewRequests).toHaveLength(0);
  expect(fixture.modelRequests).toBe(0);
  await expect(page.getByRole('button', { name: 'Request refresh' })).toHaveCount(0);
  await page.goto('/#/home?view=usage');
  await expect(page.getByRole('heading', { name: 'Welcome', exact: true })).toBeVisible();
  await expect(page.getByTestId('usage-summary')).toHaveCount(0);
  await expect(page.getByTestId('usage-trend')).toHaveCount(0);
  expect(fixture.overviewRequests).toHaveLength(0);
});

test('compact overview keeps important risks and cost groups visible while diagnostics start collapsed', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const fixture = await installCloudflareHomeFixture(page);
  await page.goto('/#/home?view=usage');
  await expect(page.getByText(/Fixture account/)).toBeVisible();
  const cards = page.getByTestId('usage-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.filter({ hasText: 'Requests' }).getByText(/At least 80% used/)).toBeVisible();
  await expect(cards.filter({ hasText: 'Rows' }).getByText(/Hard limit reached/)).toBeVisible();
  await expect(
    cards.filter({ hasText: 'Neurons' }).getByText(/Included allowance reached/),
  ).toBeVisible();
  await expect(
    cards.filter({ hasText: 'Unknown storage' }).getByText('Unknown GB-month', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('USD 0.30', { exact: true })).toBeVisible();
  await expect(page.getByText('USD 0.90', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('EUR 1.25', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('usage-trend')).toHaveCount(1);
  await expect(page.getByText('Billing Read permission missing', { exact: true })).toBeHidden();
  await expect(page.getByText('Billing range is not covered', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Metric details', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(
    page.getByRole('button', { name: 'Coverage and limitations', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Charge details', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('button', { name: 'Request refresh' })).toHaveCount(0);
  await chooseUsageRange(page, 30);
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(30);
  await page.screenshot({ path: testInfo.outputPath('usage-overview-light.png'), fullPage: true });
});

test('technical details are available through keyboard disclosures and an accessible metric dialog', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page);
  await page.goto('/#/home?view=usage');
  const coverage = page.getByRole('button', { name: 'Coverage and limitations', exact: true });
  await coverage.press('Enter');
  await expect(coverage).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Billing Read permission missing', { exact: true })).toBeVisible();
  await coverage.press('Enter');
  await expect(page.getByText('Billing Read permission missing', { exact: true })).toBeHidden();
  const details = page.getByRole('button', { name: 'Metric details', exact: true });
  await details.press('Enter');
  await expect(page.getByRole('table')).toBeVisible();
  await details.press('Enter');
  await expect(page.getByRole('table')).toBeHidden();
  const metricInfo = page.getByRole('button', { name: 'View details: Requests', exact: true });
  await metricInfo.press('Enter');
  const dialog = page.getByRole('dialog', { name: /^Metric details/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Official usage fixture', { exact: true })).toBeVisible();
  await dialog.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(metricInfo).toBeFocused();
});

test('daily trend preserves gaps, shows both thresholds and keeps above-limit points inside the scale', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page, { overview: dailyUsageOverview() });
  await page.goto('/#/home?view=usage');
  await expect(
    page.getByRole('img', { name: 'Daily usage (requests)', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(5);
  await expect(page.getByTestId('usage-trend-segment')).toHaveCount(2);
  await expect(page.getByTestId('usage-threshold-warning')).toHaveCount(1);
  await expect(page.getByTestId('usage-threshold-warning')).toHaveAttribute('data-value', '80');
  await expect(page.getByTestId('usage-threshold-limit')).toHaveCount(1);
  await expect(page.getByTestId('usage-threshold-limit')).toHaveAttribute('data-value', '100');
  await expect(page.locator('[data-testid="usage-trend-point"][data-value="999"]')).toHaveCount(0);
  const aboveLimit = page.locator('[data-testid="usage-trend-point"][data-value="120"]');
  const pointY = Number(await aboveLimit.getAttribute('cy'));
  const limitY = Number(await page.getByTestId('usage-threshold-limit').getAttribute('y1'));
  expect(pointY).toBeGreaterThanOrEqual(0);
  expect(pointY).toBeLessThan(limitY);
  await expect(page.getByTestId('usage-card').getByText(/Hard limit reached/)).toBeVisible();
});

test('one and three day filters request UTC windows without changing the current-period card total', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const fixture = await installCloudflareHomeFixture(page, { overview: dailyUsageOverview() });
  await page.goto('/#/home?view=usage');
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(5);
  await chooseUsageRange(page, 1);
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(1);
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(1);
  await expect(page.getByTestId('usage-trend-segment')).toHaveCount(0);
  await expect(
    page.getByTestId('usage-card').getByText('120 requests', { exact: true }),
  ).toBeVisible();
  await chooseUsageRange(page, 3);
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(3);
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(2);
  await expect(page.getByTestId('usage-trend-segment')).toHaveCount(1);
  await expect(
    page.getByTestId('usage-card').getByText('120 requests', { exact: true }),
  ).toBeVisible();
});

test('billing-cycle trend uses observed cumulative points without adding daily or old API cumulative values', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page, { overview: cumulativeUsageOverview() });
  await page.goto('/#/home?view=usage');
  await chooseUsageRange(page, 30);
  await expect(
    page.getByRole('img', { name: 'Cumulative usage (requests)', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(3);
  await expect(page.getByTestId('usage-trend-segment')).toHaveCount(2);
  expect(
    await page
      .getByTestId('usage-trend-point')
      .evaluateAll((points) => points.map((point) => point.getAttribute('data-value'))),
  ).toEqual(['40', '60', '80']);
  await expect(page.getByTestId('usage-threshold-limit')).toHaveCount(1);
  await expect(page.locator('[data-testid="usage-trend-point"][data-value="999"]')).toHaveCount(0);
});

test('a billing metric without observations starts at its known current total instead of fabricating a curve', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = cumulativeUsageOverview();
  overview.history = overview.history.filter(
    (point) => !point.source.startsWith('quota-observation:'),
  );
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home?view=usage');
  await expect(
    page.getByRole('img', { name: 'Cumulative usage (requests)', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(1);
  await expect(page.getByTestId('usage-trend-point')).toHaveAttribute('data-value', '80');
  await expect(page.getByTestId('usage-trend-segment')).toHaveCount(0);
  await expect(page.getByTestId('usage-threshold-limit')).toHaveCount(1);
});

test('current capacity stays a current point and is not accumulated from historical quantities', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page, { overview: capacityUsageOverview() });
  await page.goto('/#/home?view=usage');
  await expect(page.getByRole('img', { name: 'Current capacity (GB)', exact: true })).toBeVisible();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(1);
  await expect(page.getByTestId('usage-trend-point')).toHaveAttribute('data-value', '6');
  await expect(page.getByTestId('usage-trend-segment')).toHaveCount(0);
  await expect(page.getByTestId('usage-threshold-limit')).toHaveCount(1);
});

test('unknown quota and stale estimates remain explicit without invented threshold lines', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = dailyUsageOverview();
  overview.metrics[0] = {
    ...overview.metrics[0],
    limit: null,
    remaining: null,
    percentage: null,
    quotaKind: 'unknown',
    quality: 'estimated',
    status: 'stale',
    reason: 'Fixture stale source diagnostics',
  };
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home?view=usage');
  const card = page.getByTestId('usage-card');
  await expect(card.getByText('Unknown quota', { exact: true })).toBeVisible();
  await expect(card.getByText('Estimated', { exact: true })).toBeVisible();
  await expect(card.getByText(/Stale/)).toBeVisible();
  await expect(page.getByText('Fixture stale source diagnostics', { exact: true })).toBeHidden();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(5);
  await expect(page.getByTestId('usage-threshold-warning')).toHaveCount(0);
  await expect(page.getByTestId('usage-threshold-limit')).toHaveCount(0);
});

test('a known quota with unknown consumption does not reuse an old percentage or become zero progress', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = dailyUsageOverview();
  overview.metrics[0] = {
    ...overview.metrics[0],
    used: null,
    remaining: null,
    percentage: 80,
  };
  overview.history = [];
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home?view=usage');
  const card = page.getByTestId('usage-card');
  await expect(card.getByText('Unknown requests', { exact: true })).toBeVisible();
  await expect(card).toContainText('Hard limit: 100');
  await expect(card.getByText('0%', { exact: true })).toHaveCount(0);
  await expect(card.getByText('80%', { exact: true })).toHaveCount(0);
  await expect(card.getByRole('progressbar')).toHaveCount(0);
  await expect(card.getByText(/At least 80% used/)).toHaveCount(0);
  await expect(page.getByText(/\d+ need attention/)).toHaveCount(0);
});

test('a previous-period value stays labelled and cannot create current-quota progress or thresholds', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = dailyUsageOverview();
  overview.metrics[0] = {
    ...overview.metrics[0],
    periodStartUtc: Date.UTC(2026, 9, 24),
    periodEndUtc: Date.UTC(2026, 9, 25),
    resetTimeUtc: Date.UTC(2026, 9, 25),
    collectedTimeUtc: usageFixtureNow - 86_400_000,
  };
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home?view=usage');
  const card = page.getByTestId('usage-card');
  await expect(card.getByText('Previous period', { exact: true })).toBeVisible();
  await expect(card.getByText('120 requests', { exact: true })).toBeVisible();
  await expect(card.getByText('Unknown quota', { exact: true })).toBeVisible();
  await expect(card.getByRole('progressbar')).toHaveCount(0);
  await expect(card.getByText(/Hard limit reached|At least 80% used/)).toHaveCount(0);
  await expect(page.getByTestId('usage-threshold-warning')).toHaveCount(0);
  await expect(page.getByTestId('usage-threshold-limit')).toHaveCount(0);
});

test('a failed range read retains the last snapshot and allows one local reload', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const fixture = await installCloudflareHomeFixture(page, { overview: dailyUsageOverview() });
  let rejectRead = false;
  await page.route('**/api/v1/admin/maintenance/cloudflare-usage/overview', async (route) => {
    if (!rejectRead) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Fixture read unavailable' }),
    });
  });
  await page.goto('/#/home?view=usage');
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(5);
  rejectRead = true;
  await chooseUsageRange(page, 3);
  const error = page.getByText('Unable to load the usage snapshot. Try again later.', {
    exact: true,
  });
  await expect(error).toHaveCount(1);
  await expect(error).toBeVisible();
  await expect(
    page.getByTestId('usage-card').getByText('120 requests', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('#global-snackbar-container')).toHaveCount(0);
  rejectRead = false;
  await page.getByRole('button', { name: 'Reload snapshot', exact: true }).click();
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(3);
  await expect(error).toBeHidden();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(2);
});

test('identity revision clears an open metric detail dialog', async ({ page }) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page);
  await page.goto('/#/home?view=usage');
  await page.getByRole('button', { name: 'View details: Requests', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /^Metric details/ });
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem('hodor:auth-session', 'fixture-new-dashboard-revision');
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Official usage fixture', { exact: true })).toBeHidden();
});

test('manual refresh requires update permission and missing configuration stays an honest empty state', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = usageOverview();
  overview.configuration = 'missing';
  overview.account = null;
  overview.metrics = [];
  overview.costs = [];
  overview.history = [];
  const fixture = await installCloudflareHomeFixture(page, {
    overview,
    permissions: [
      'admin.maintenance.cloudflare_usage:read',
      'admin.maintenance.cloudflare_usage:update',
    ],
  });
  await page.goto('/#/home?view=usage');
  await expect(page.getByText(/Cloudflare usage collection is not configured/)).toBeVisible();
  await expect(
    page.getByText(/Charges are unavailable; this does not mean zero charges/),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open AI chat' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Request refresh' }).click();
  await expect(page.getByText(/A collection job was queued or merged/)).toBeVisible();
  expect(fixture.refreshRequests).toBe(1);
});

test('cost totals separate bases and never combine charges with unknown periods or bases', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  const overview = usageOverview();
  const base = overview.costs[0];
  overview.costs = [
    { ...base, id: 'billed-one', amount: '0.10' },
    { ...base, id: 'billed-two', amount: '0.20' },
    { ...base, id: 'contracted', amount: '0.40', status: 'official_usage_cost_contracted' },
    { ...base, id: 'unknown-period-one', amount: '0.80', periodEndUtc: null },
    { ...base, id: 'unknown-period-two', amount: '0.90', periodEndUtc: null },
    { ...base, id: 'unknown-basis-one', amount: '0.05', status: 'provider_future_basis' },
    { ...base, id: 'unknown-basis-two', amount: '0.06', status: 'provider_future_basis' },
  ];
  await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home?view=usage');
  const groups = page.getByTestId('usage-cost-group');
  await expect(groups).toHaveCount(6);
  await expect(groups.filter({ hasText: 'USD 0.30' })).toContainText('Billed cost basis');
  await expect(
    groups
      .filter({ hasText: 'Contracted cost basis' })
      .getByText('USD 0.40', { exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByText('USD 0.70', { exact: true })).toHaveCount(0);
  await expect(page.getByText('USD 1.70', { exact: true })).toHaveCount(0);
  await expect(page.getByText('USD 0.11', { exact: true })).toHaveCount(0);
});

test('mobile viewport keeps the dashboard inside the page', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await page.setViewportSize({ width: 390, height: 844 });
  const overview = usageOverview();
  const longReason = `https://fixture.invalid/${'diagnostic-source-'.repeat(30)}`;
  overview.coverage.push({
    product: 'Fixture diagnostics',
    status: 'unavailable',
    reason: longReason,
  });
  const fixture = await installCloudflareHomeFixture(page, { overview });
  await page.goto('/#/home?view=usage');
  await expect(page.getByText(/Fixture account/)).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: '1 day', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '3 days', exact: true })).toBeVisible();
  await chooseUsageRange(page, 3);
  expect(fixture.overviewRequests.at(-1)?.days).toBe(3);
  const details = page.getByRole('button', { name: 'Metric details', exact: true });
  await details.click();
  await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await details.click();
  const coverage = page.getByRole('button', { name: 'Coverage and limitations', exact: true });
  await coverage.click();
  await expect(page.getByText(longReason, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await coverage.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath('usage-overview-dark-mobile.png'),
    fullPage: true,
  });
});

test('Chinese dashboard translates short ranges and cumulative chart without exposing collapsed diagnostics', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date(usageFixtureNow));
  await installCloudflareHomeFixture(page, {
    overview: cumulativeUsageOverview(),
    langCode: 'zh-CN',
  });
  await page.goto('/#/home?view=usage');
  await expect(
    page.getByRole('heading', { name: 'Cloudflare 用量总览', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '1 天', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '3 天', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '累计用量 (requests)', exact: true })).toBeVisible();
  await expect(page.getByTestId('usage-trend-point')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '指标明细', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByText('Billing Read permission missing', { exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('usage-overview-zh-CN.png'), fullPage: true });
});

test('image validation rejects spoofed content and files larger than five MiB', async ({
  page,
}) => {
  const fixture = await installCloudflareHomeFixture(page);
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByRole('combobox')).toHaveText('Fixture text');
  await page.getByRole('combobox').click();
  await expect(page.getByRole('option', { name: /Fixture offline/ })).toBeDisabled();
  await page.getByRole('option', { name: /Fixture vision/ }).click();
  const imageInput = page.getByTestId('chat-image-input');
  await imageInput.setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not png content'),
  });
  await expect(page.getByText('Choose a valid PNG/JPEG image no larger than 5 MiB.')).toBeVisible();
  await expect(page.getByAltText('Image preview')).toHaveCount(0);
  await imageInput.setInputFiles({
    name: 'oversize.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByText('Choose a valid PNG/JPEG image no larger than 5 MiB.')).toHaveCount(
    1,
  );
  expect(fixture.askRequests).toHaveLength(0);
});

test('chat permission denial prevents both catalog and generation requests', async ({ page }) => {
  const fixture = await installCloudflareHomeFixture(page, {
    permissions: ['admin.system.auth:read'],
  });
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByText('You do not have permission to use AI chat.')).toBeVisible();
  expect(fixture.modelRequests).toBe(0);
  expect(fixture.askRequests).toHaveLength(0);
});

test('identity revision during generation clears the old question and rejects its late result', async ({
  page,
}) => {
  await installCloudflareHomeFixture(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route('**/api/v1/admin/ai/chat/ask', async (route) => {
    started = true;
    await pending;
    await route.fulfill(fulfillOk('old identity answer'));
  });
  await page.goto('/#/admin/ai/chat');
  await expect(page.getByRole('combobox')).toHaveText('Fixture text');
  await page.getByPlaceholder(/Type your question/).fill('old identity question');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await page.evaluate(() => {
    localStorage.setItem('hodor:auth-session', 'fixture-new-revision');
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  release?.();
  await expect(page.getByText('old identity question', { exact: true })).toHaveCount(0);
  await expect(page.getByText('old identity answer', { exact: true })).toHaveCount(0);
  await expect(page.locator('#global-snackbar-container')).toHaveCount(0);
});
