import { expect, test, type Page } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment';
import { installMobileTaskRuntimeFixture } from '../support/mobile-task-runtime-fixture';

const environment = readE2EEnvironment();
test.skip(
  !environment.mockAuth ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(environment.baseUrl).hostname),
  'Requires isolated loopback mock-auth fixture.',
);
test.use({ storageState: { cookies: [], origins: [] } });

async function openTasks(page: Page) {
  await page.goto('/#/admin/mobile/device');
  await page
    .getByRole('row')
    .filter({ hasText: 'fixture-device-one' })
    .getByRole('button', { name: 'Device Status', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Current task and queue', exact: true }).click();
}
const running = (page: Page) => page.getByTestId('device-task-task-running-01');
const confirm = (page: Page) => page.getByRole('dialog', { name: /^Terminate/u });

test('shows actual running and priority queue order, with explicit server cancellation eligibility', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  await page.goto('/#/admin/mobile/device');
  await page
    .getByRole('row')
    .filter({ hasText: 'fixture-device-one' })
    .getByRole('button', { name: 'Device Status', exact: true })
    .click();
  const taskTab = page.getByRole('tab', { name: 'Current task and queue', exact: true });
  await expect(taskTab).not.toBeInViewport({ ratio: 0.99 });
  const tabs = page.locator('.MuiTabs-root').filter({ has: taskTab });
  const rightArrow = tabs.locator('.MuiTabs-scrollButtons').last();
  await expect(rightArrow).toBeVisible();
  await rightArrow.click();
  await expect(taskTab).toBeInViewport({ ratio: 0.99 });
  const bounds = await taskTab.boundingBox();
  if (!bounds) throw new Error('Task tab has no visible bounds');
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(running(page)).toContainText('Running');
  await expect(running(page)).toContainText('device.network.switch');
  const rows = page.locator('[data-testid^="device-task-"]');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(1)).toContainText('task-queued-high');
  await expect(rows.nth(2)).toContainText('task-queued-normal');
  await expect(rows.nth(3)).toContainText('task-queued-low');
  await expect(
    page
      .getByTestId('device-task-task-external-01')
      .getByRole('button', { name: 'Terminate', exact: true }),
  ).toBeDisabled();
  expect(fixture.reads).toEqual(['fixture-device-one']);
  expect(fixture.cancelRequests).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('task-runtime-panel.png') });
});

test('confirmation cancellation does not write; acceptance reports sent and never reports terminated', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect(confirm(page)).toContainText('task-running-01');
  await confirm(page).getByRole('button', { name: 'Cancel', exact: true }).last().click();
  expect(fixture.cancelRequests).toHaveLength(0);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Termination request sent. Waiting for the device to confirm.',
  );
  expect(fixture.cancelRequests).toEqual([
    { clientId: 'fixture-device-one', taskId: 'task-running-01' },
  ]);
  await expect(running(page)).toContainText('Running');
  await expect(
    running(page).getByRole('button', { name: 'Terminate', exact: true }),
  ).toBeDisabled();
});

test('double confirmation submits once while a request is pending', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  let release = () => {};
  fixture.beforeCancel = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).dblclick();
  await expect.poll(() => fixture.cancelRequests.length).toBe(1);
  release();
  await expect(
    page.getByText('Termination request sent. Waiting for the device to confirm.', { exact: true }),
  ).toBeVisible();
});

test('read-only and absent read permissions prevent cancellation and unauthorized reads', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page, {
    permissions: ['admin.mobile.device:read', 'admin.mobile.async_task:read'],
  });
  await openTasks(page);
  await expect(running(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terminate', exact: true })).toHaveCount(0);
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('no read permission sends no state requests', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page, {
    permissions: ['admin.mobile.device:read'],
  });
  await openTasks(page);
  await expect(
    page.getByText('You do not have permission to read device tasks.', { exact: true }),
  ).toBeVisible();
  expect(fixture.reads).toHaveLength(0);
});

test('distinguishes absent snapshot from a genuine empty queue', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  fixture.runtime['fixture-device-one'].snapshot = null;
  fixture.runtime['fixture-device-one'].receivedTimeUtc = null;
  fixture.runtime['fixture-device-one'].cancellableTaskIds = [];
  await openTasks(page);
  await expect(
    page.getByText(
      'The device has not reported a task snapshot. Check that its client is updated and online.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText('No queued tasks.', { exact: true })).toHaveCount(0);
});

test('empty queue and running state are shown without inventing pending tasks', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  const snapshot = fixture.runtime['fixture-device-one'].snapshot;
  if (!snapshot) throw new Error('Fixture missing snapshot');
  snapshot.running = null;
  snapshot.queued = [];
  await openTasks(page);
  await expect(page.getByText('No task is currently running.', { exact: true })).toBeVisible();
  await expect(page.getByText('No queued tasks.', { exact: true })).toBeVisible();
});

test('starting, stale and expired device reports cannot be cancelled', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  const snapshot = fixture.runtime['fixture-device-one'].snapshot;
  if (!snapshot?.running) throw new Error('Fixture missing running task');
  snapshot.running.phase = 'STARTING';
  snapshot.running.cancellable = false;
  fixture.runtime['fixture-device-one'].cancellableTaskIds = [];
  fixture.runtime['fixture-device-one'].stale = true;
  await openTasks(page);
  await expect(running(page)).toContainText('Starting');
  await expect(
    page.getByText(
      'This is an expired device report. Wait for an update before terminating tasks.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    running(page).getByRole('button', { name: 'Terminate', exact: true }),
  ).toBeDisabled();
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('local elapsed time disables an otherwise fresh report after its retention window', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  await page.clock.install();
  await openTasks(page);
  await expect(running(page).getByRole('button', { name: 'Terminate', exact: true })).toBeEnabled();
  await page.clock.fastForward(61_000);
  await expect(
    running(page).getByRole('button', { name: 'Terminate', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      'This is an expired device report. Wait for an update before terminating tasks.',
      { exact: true },
    ),
  ).toBeVisible();
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('a successful send remains successful when its follow-up refresh fails', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  fixture.failReadAfterCancel = true;
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect(
    page.getByText('Termination request sent. Waiting for the device to confirm.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Could not read task state. Refresh before taking action.', { exact: true }),
  ).toBeVisible();
  expect(fixture.cancelRequests).toHaveLength(1);
});

test('an unknown outcome only allows a fresh manual reconfirmation to retry', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  fixture.cancelMode = 'unknown';
  await page.clock.install();
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect(
    page.getByText(
      'The termination request could not be confirmed. Refresh to check device state.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.clock.runFor(5100);
  await expect(
    running(page).getByRole('button', { name: 'Terminate', exact: true }),
  ).toBeDisabled();
  expect(fixture.cancelRequests).toHaveLength(1);
  await page.getByRole('button', { name: 'Refresh', exact: true }).last().click();
  await expect(running(page).getByRole('button', { name: 'Terminate', exact: true })).toBeEnabled();
  expect(fixture.cancelRequests).toHaveLength(1);
  fixture.cancelMode = 'accepted';
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect(
    page.getByText('Termination request sent. Waiting for the device to confirm.', { exact: true }),
  ).toBeVisible();
  expect(fixture.cancelRequests).toHaveLength(2);
});

for (const mode of ['business', 'business200'] as const)
  test(`business rejection ${mode} is presented exactly once`, async ({ page }) => {
    const fixture = await installMobileTaskRuntimeFixture(page);
    fixture.cancelMode = mode;
    await openTasks(page);
    await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
    await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
    await expect(
      page.getByText(
        'The termination request was rejected. Device state or permissions may have changed; refresh before trying again.',
        { exact: true },
      ),
    ).toHaveCount(1);
    await expect(page.getByText('Fixture cancellation rejected', { exact: true })).toHaveCount(0);
  });

test('closing the drawer discards a delayed response and stops polling', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  let release = () => {};
  fixture.beforeRead = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  await openTasks(page);
  await expect.poll(() => fixture.reads.length).toBe(1);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  release();
  await expect(page.getByRole('tab', { name: 'Current task and queue', exact: true })).toHaveCount(
    0,
  );
  await expect(running(page)).toHaveCount(0);
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('switching devices discards the former device response', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  const second = fixture.runtime['fixture-device-two'].snapshot;
  if (!second?.running) throw new Error('Fixture missing running task');
  second.running.taskId = 'task-second-device';
  fixture.runtime['fixture-device-two'].cancellableTaskIds = [];
  let release = () => {};
  fixture.beforeRead = (clientId) =>
    clientId === 'fixture-device-one'
      ? new Promise<void>((resolve) => {
          release = resolve;
        })
      : Promise.resolve();
  await openTasks(page);
  await expect.poll(() => fixture.reads.length).toBe(1);
  // Exercise the same device-selection event used by the table action.
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('OPEN_DEVICE_STATUS_DRAWER', {
        detail: { id: 2, clientId: 'fixture-device-two' },
      }),
    ),
  );
  await page.getByRole('tab', { name: 'Current task and queue', exact: true }).click();
  await expect(page.getByTestId('device-task-task-second-device')).toBeVisible();
  release();
  await expect(running(page)).toHaveCount(0);
  await expect(page.getByTestId('device-task-task-second-device')).toBeVisible();
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('a newer snapshot wins over a delayed earlier read', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  let release = () => {};
  fixture.beforeRead = (_clientId, sequence) =>
    sequence === 1
      ? new Promise<void>((resolve) => {
          release = resolve;
        })
      : Promise.resolve();
  await openTasks(page);
  await expect.poll(() => fixture.reads.length).toBe(1);
  const snapshot = fixture.runtime['fixture-device-one'].snapshot;
  if (!snapshot) throw new Error('Fixture missing snapshot');
  snapshot.running = null;
  snapshot.revision += 1;
  await page.getByRole('button', { name: 'Refresh', exact: true }).last().click();
  await expect(page.getByText('No task is currently running.', { exact: true })).toBeVisible();
  release();
  await expect(running(page)).toHaveCount(0);
});

test('confirmation rechecks snapshot revision after a periodic refresh', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  await page.clock.install();
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  const snapshot = fixture.runtime['fixture-device-one'].snapshot;
  if (!snapshot) throw new Error('Fixture missing snapshot');
  snapshot.revision += 1;
  await page.clock.runFor(5100);
  await expect.poll(() => fixture.reads.length).toBeGreaterThan(1);
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect(
    page.getByText('Task state or permissions changed. Refresh and confirm again.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('backgrounding clears the confirmation and stops periodic reads until visible', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  await page.clock.install();
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(confirm(page)).toHaveCount(0);
  const before = fixture.reads.length;
  await page.clock.runFor(11_000);
  expect(fixture.reads).toHaveLength(before);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => fixture.reads.length).toBeGreaterThan(before);
  expect(fixture.cancelRequests).toHaveLength(0);
});

test('a late write response after backgrounding keeps its outcome unknown', async ({ page }) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  let release = () => {};
  fixture.beforeCancel = () =>
    new Promise<void>((resolve) => {
      release = resolve;
    });
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await confirm(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  await expect.poll(() => fixture.cancelRequests.length).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const response = page.waitForResponse((item) => item.url().endsWith('/async-task/cancel'));
  release();
  await response;
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(
    page.getByText(
      'The termination request could not be confirmed. Refresh to check device state.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Termination request sent. Waiting for the device to confirm.', { exact: true }),
  ).toHaveCount(0);
  expect(fixture.cancelRequests).toHaveLength(1);
});

test('a session change removes the former task and its confirmation without writing', async ({
  page,
}) => {
  const fixture = await installMobileTaskRuntimeFixture(page);
  await openTasks(page);
  await running(page).getByRole('button', { name: 'Terminate', exact: true }).click();
  fixture.auth.permissions = [];
  await page.evaluate(() => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: 84,
        username: 'other_fixture',
        token: 'other-fixture-token',
        langCode: 'en-US',
      }),
    );
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  await expect(confirm(page)).toHaveCount(0);
  await expect(running(page)).toHaveCount(0);
  expect(fixture.cancelRequests).toHaveLength(0);
});
