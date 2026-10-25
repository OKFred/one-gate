import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';
import {
  fulfillOk,
  installCloudflareHomeFixture,
  usageOverview,
  type ChatRequest,
} from '../support/cloudflare-home-fixture.js';

test.skip(!readE2EEnvironment().mockAuth, 'This suite only uses isolated API fixtures.');

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
});

test('read-only overview preserves unknowns, distinct thresholds, decimal currencies and period groups', async ({
  page,
}, testInfo) => {
  const fixture = await installCloudflareHomeFixture(page);
  await page.goto('/#/home');
  await expect(page.getByText('Fixture account', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('img', { name: 'Daily usage (requests)' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Cumulative snapshots (not daily consumption) (requests)' }),
  ).toBeVisible();
  await expect(page.getByText('Billing Read permission missing', { exact: true })).toBeVisible();
  await expect(page.getByText(/Some sources have not updated/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request refresh' })).toHaveCount(0);
  await page.getByRole('button', { name: '30 days', exact: true }).click();
  await expect.poll(() => fixture.overviewRequests.at(-1)?.days).toBe(30);
  await page.screenshot({ path: testInfo.outputPath('usage-overview-light.png'), fullPage: true });
});

test('manual refresh requires update permission and missing configuration stays an honest empty state', async ({
  page,
}) => {
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
  await page.goto('/#/home');
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
  await page.goto('/#/home');
  const groups = page.getByTestId('usage-cost-group');
  await expect(groups).toHaveCount(6);
  await expect(
    groups.filter({ hasText: 'USD 0.30' }).getByText('Billed cost basis', { exact: true }).first(),
  ).toBeVisible();
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
  await page.setViewportSize({ width: 390, height: 844 });
  await installCloudflareHomeFixture(page);
  await page.goto('/#/home');
  await expect(page.getByText('Fixture account', { exact: true })).toBeVisible();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath('usage-overview-dark-mobile.png'),
    fullPage: true,
  });
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
