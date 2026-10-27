import { expect, test, type Page } from '@playwright/test';
import type { paths } from '../../packages/ui/src/types/openapi';
import { installCalendarFixture } from '../support/calendar-fixture';
import { fulfillOk } from '../support/cloudflare-home-fixture';
import { readE2EEnvironment } from '../support/test-environment';

declare global {
  interface Window {
    syntheticCopy(value: string): Promise<void>;
  }
}

type Status =
  paths['/api/v1/personal/calendar/subscription/status']['post']['responses'][200]['content']['application/json']['data'];
type Mutation = NonNullable<
  paths['/api/v1/personal/calendar/subscription/rotate']['post']['requestBody']
>['content']['application/json'];

test.skip(!readE2EEnvironment().mockAuth, 'Subscription tests use synthetic credentials only.');
const url = `https://calendar.example.test/calendar-subscription.ics?token=ogcal1_${'A'.repeat(43)}`;

async function fixture(page: Page, initial: Partial<Status> = {}) {
  await installCalendarFixture(page);
  const state = {
    status: {
      configured: true,
      enabled: false,
      version: null,
      updatedTimeUtc: null,
      ...initial,
    } as Status,
    reads: 0,
    writes: [] as { action: string; input: Mutation }[],
    loseResponse: false,
    conflictStatus: 0,
    invalidAddress: false,
    beforeResponse: null as (() => Promise<void>) | null,
    beforeStatus: null as (() => Promise<void>) | null,
  };
  await page.route('**/api/v1/personal/calendar/subscription/*', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1)!;
    if (action === 'status') {
      state.reads += 1;
      if (state.beforeStatus) await state.beforeStatus();
      return route.fulfill(fulfillOk(state.status));
    }
    const input = route.request().postDataJSON() as Mutation;
    state.writes.push({ action, input });
    if (state.conflictStatus) {
      return route.fulfill({
        status: state.conflictStatus,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          message: 'personal.calendar.subscription.stateConflict',
          data: { code: 'CALENDAR_SUBSCRIPTION_STATE_CONFLICT' },
        }),
      });
    }
    state.status = {
      configured: state.status.configured,
      enabled: action === 'rotate',
      version: (state.status.version ?? 0) + 1,
      updatedTimeUtc: 1793066400000,
    };
    if (state.beforeResponse) await state.beforeResponse();
    if (state.loseResponse) {
      state.loseResponse = false;
      return route.abort('connectionfailed');
    }
    return route.fulfill(
      fulfillOk({
        version: state.status.version,
        updatedTimeUtc: state.status.updatedTimeUtc,
        ...(action === 'rotate'
          ? { subscriptionUrl: state.invalidAddress ? 'http://example.test/?token=unsafe' : url }
          : {}),
      }),
    );
  });
  await page.goto('/#/calendar');
  return state;
}

async function open(page: Page) {
  await page.getByTestId('calendar-subscription-open').click();
  await expect(page.getByTestId('calendar-subscription-dialog')).toBeVisible();
  await expect(page.getByTestId('calendar-subscription-refresh')).toBeEnabled();
}

async function generate(page: Page) {
  await page.getByTestId('calendar-subscription-generate').click();
  await page.getByTestId('calendar-subscription-confirm').click();
}

test('status is requested on demand; generation is confirmed and the secret is shown once', async ({
  page,
}) => {
  const state = await fixture(page);
  expect(state.reads).toBe(0);
  await open(page);
  expect(state.reads).toBe(1);
  await page.getByTestId('calendar-subscription-generate').click();
  expect(state.writes).toHaveLength(0);
  await expect(page.getByRole('dialog').last()).toContainText('Anyone with the private link');
  await page.getByTestId('calendar-subscription-confirm').click();
  await expect(page.getByTestId('calendar-subscription-url')).toHaveValue(url);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveAttribute('type', 'password');
  expect(state.writes).toEqual([{ action: 'rotate', input: { expectedVersion: null } }]);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await open(page);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
  await expect(page.getByTestId('calendar-subscription-dialog')).toContainText(
    'cannot be shown again',
  );
  expect(state.writes).toHaveLength(1);
  expect(
    await page.evaluate(
      (secret) => Object.values(localStorage).some((value) => value.includes(secret)),
      url,
    ),
  ).toBe(false);
});

test('missing origin disables generation but still permits revocation', async ({ page }) => {
  const state = await fixture(page, { configured: false, enabled: true, version: 5 });
  await open(page);
  await expect(page.getByTestId('calendar-subscription-generate')).toBeDisabled();
  await page.getByTestId('calendar-subscription-revoke').click();
  await expect(page.getByRole('dialog').last()).toContainText(
    'Already downloaded copies may remain',
  );
  await page.getByTestId('calendar-subscription-confirm').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Subscription disabled.' })).toBeVisible();
  expect(state.writes).toEqual([{ action: 'revoke', input: { expectedVersion: 5 } }]);
});

test('copying requires an explicit click and reports success only after it completes', async ({
  page,
}) => {
  const copies: string[] = [];
  await page.exposeFunction('syntheticCopy', (value: string) => {
    copies.push(value);
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (value: string) => window.syntheticCopy(value) },
    });
  });
  await fixture(page);
  await open(page);
  await generate(page);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveValue(url);
  expect(copies).toHaveLength(0);
  await page.getByTestId('calendar-subscription-copy').click();
  await expect(page.getByRole('alert')).toContainText('Subscription address copied.');
  expect(copies).toEqual([url]);
});

for (const status of [200, 409]) {
  test(`business conflict at HTTP ${status} is shown once without success`, async ({ page }) => {
    const state = await fixture(page);
    state.conflictStatus = status;
    await open(page);
    await generate(page);
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('alert')).toContainText('The subscription settings changed');
    await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
    await expect(
      page.getByText('Private address generated. Copy it before closing.', { exact: true }),
    ).toHaveCount(0);
    expect(state.writes).toHaveLength(1);
  });
}

test('lost committed response requires manual status refresh before any further write', async ({
  page,
}) => {
  const state = await fixture(page);
  state.loseResponse = true;
  await open(page);
  await generate(page);
  await expect(page.getByRole('alert')).toContainText('The result could not be confirmed');
  await expect(page.getByTestId('calendar-subscription-generate')).toBeDisabled();
  await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
  expect(state.status.enabled).toBe(true);
  expect(state.writes).toHaveLength(1);
  await page.getByTestId('calendar-subscription-refresh').click();
  await expect(page.getByTestId('calendar-subscription-generate')).toBeEnabled();
  await expect(page.getByTestId('calendar-subscription-dialog')).toContainText(
    'cannot be shown again',
  );
  expect(state.writes).toHaveLength(1);
  await generate(page);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveValue(url);
  expect(state.writes[1].input).toEqual({ expectedVersion: 1 });
});

test('an invalid returned address is unknown and closes the confirmation overlay', async ({
  page,
}) => {
  const state = await fixture(page);
  state.invalidAddress = true;
  await open(page);
  await generate(page);
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('The result could not be confirmed');
  await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
  await expect(page.getByTestId('calendar-subscription-generate')).toBeDisabled();
});

test('status changes elsewhere remove an obsolete displayed secret', async ({ page }) => {
  const state = await fixture(page);
  await open(page);
  await generate(page);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveValue(url);
  state.status = { ...state.status, version: 2 };
  await page.getByTestId('calendar-subscription-refresh').click();
  await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
  await expect(
    page.getByText('Private address generated. Copy it before closing.', { exact: true }),
  ).toHaveCount(0);
});

test('copy is unavailable while a refresh may invalidate the displayed address', async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await generate(page);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveValue(url);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.beforeStatus = () => pending;
  state.status = { ...state.status, version: 2 };
  await page.getByTestId('calendar-subscription-refresh').click();
  await expect(page.getByTestId('calendar-subscription-copy')).toBeDisabled();
  release();
  await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
  await expect(page.getByText('Subscription address copied.', { exact: true })).toHaveCount(0);
});

for (const outcome of ['success', 'failure']) {
  test(`a late clipboard ${outcome} cannot replace a newer unknown write result`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () =>
            new Promise<void>((resolve, reject) => {
              window.addEventListener(
                'synthetic:clipboard-finish',
                (event) => {
                  if (event instanceof CustomEvent && event.detail === 'success') resolve();
                  else reject(new Error('Synthetic copy failure'));
                },
                { once: true },
              );
            }),
        },
      });
    });
    const state = await fixture(page);
    await open(page);
    await generate(page);
    await expect(page.getByTestId('calendar-subscription-url')).toHaveValue(url);
    await page.getByTestId('calendar-subscription-copy').click();
    state.loseResponse = true;
    await generate(page);
    await expect(page.getByRole('alert')).toContainText('The result could not be confirmed');
    await page.evaluate(
      (detail) => window.dispatchEvent(new CustomEvent('synthetic:clipboard-finish', { detail })),
      outcome,
    );
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('alert')).toContainText('The result could not be confirmed');
    await expect(page.getByTestId('calendar-subscription-generate')).toBeDisabled();
    expect(state.writes).toHaveLength(2);
  });
}

test('double clicks cannot rotate twice and a late response cannot expose a secret after sign-out', async ({
  page,
}) => {
  const state = await fixture(page);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.beforeResponse = () => pending;
  await open(page);
  await page.getByTestId('calendar-subscription-generate').click();
  await page.getByTestId('calendar-subscription-confirm').dblclick({ delay: 10 });
  await expect.poll(() => state.writes.length).toBe(1);
  await page.evaluate(() => {
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  release();
  await expect(page.getByTestId('calendar-subscription-dialog')).toHaveCount(0);
  await expect(page.getByTestId('calendar-subscription-url')).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
});

test('320px keyboard flow keeps subscription controls inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await fixture(page);
  await open(page);
  await generate(page);
  const input = page.getByTestId('calendar-subscription-url');
  await expect(input).toHaveValue(url);
  await page.getByRole('button', { name: 'Show address', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(input).toHaveAttribute('type', 'text');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
