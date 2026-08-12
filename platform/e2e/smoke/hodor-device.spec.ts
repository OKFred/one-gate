import { expect, test } from '../fixtures.js';
import { readE2EEnvironment } from '../support/test-environment.js';

const e2eEnvironment = readE2EEnvironment();

test('目标部署的设备管理页可使用持久化登录态只读访问', async ({ page }) => {
  await page.goto('/#/admin/mobile/device');

  await expect(page).toHaveURL(/#\/admin\/mobile\/device/);
  await expect(page.getByText('设备管理', { exact: true }).first()).toBeVisible();
  if (e2eEnvironment.expectedDeviceClientId) {
    await expect(
      page.getByText(e2eEnvironment.expectedDeviceClientId, { exact: true }),
    ).toBeVisible();
  }
});
