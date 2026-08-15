import { expect, test } from '@playwright/test';
import { HODOR_AUTH_STATE_PATH, saveAuthBundle } from './support/auth-state.js';
import { readE2EEnvironment } from './support/test-environment.js';

const e2eEnvironment = readE2EEnvironment();

test('手工登录并保存 Hodor 单文件认证状态', async ({ page, context }) => {
  test.setTimeout(5 * 60_000);
  await page.goto('/#/admin/mobile/device');

  console.log('请在已打开的专用 Chrome 中完成 Hodor 登录；测试将自动继续。');
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(() => {
            const raw = localStorage.getItem('userInfo');
            if (!raw) return false;
            try {
              const parsed: unknown = JSON.parse(raw);
              return (
                typeof parsed === 'object' &&
                parsed !== null &&
                'token' in parsed &&
                typeof parsed.token === 'string' &&
                parsed.token.length > 0
              );
            } catch {
              return false;
            }
          });
        } catch {
          return false;
        }
      },
      { timeout: 5 * 60_000, message: '等待 Hodor 手工登录完成' },
    )
    .toBe(true);

  await expect(page).toHaveURL(/#\/admin\/mobile\/device/);
  await expect(page.getByText('设备管理', { exact: true }).first()).toBeVisible();
  await saveAuthBundle(context, e2eEnvironment.allowedOrigins);
  console.log(`Hodor 登录状态已保存：${HODOR_AUTH_STATE_PATH}`);
});
