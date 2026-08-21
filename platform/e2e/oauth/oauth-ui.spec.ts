import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';

const environment = readE2EEnvironment();

test.skip(!environment.mockOAuth, 'Set HODOR_E2E_MOCK_OAUTH=true for the mock provider UI suite.');

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/admin/i18n/translation/listAll', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: [], message: 'ok' }),
    });
  });
});

test('login page exposes both OAuth providers without persisting provider profiles', async ({
  page,
}) => {
  await page.route('**/api/v1/admin/system/auth/oauth/login/url', async (route) => {
    const body: unknown = route.request().postDataJSON();
    expect(body).toEqual({
      provider: 'feishu',
      redirectUri: `${environment.baseUrl}/oauth/callback`,
    });
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { url: `${environment.baseUrl}/mock-feishu` },
        message: 'ok',
      }),
    });
  });

  await page.goto('/#/login');
  await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
  await page.getByRole('button', { name: /飞书|Feishu/i }).click();
  await expect(page).toHaveURL(`${environment.baseUrl}/mock-feishu`);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => /feishu|oauth.*profile/i.test(key)),
    ),
  ).toBe(false);
});

test('fixed OAuth callback path is bridged into HashRouter with code and state intact', async ({
  page,
}) => {
  await page.route('**/api/v1/admin/system/auth/oauth/login/callback', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ code: 'mock-code', state: 'mock-state' });
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: '账号未绑定，请联系管理员' }),
    });
  });

  await page.goto('/oauth/callback?code=mock-code&state=mock-state');
  await expect(page).toHaveURL(/#\/oauth\/callback\?code=mock-code&state=mock-state/);
  await expect(page.getByText(/授权失败|Authorization failed/i).first()).toBeVisible();
});

test('successful OAuth login without assigned menus falls back to the profile page', async ({
  page,
}) => {
  const userObj = {
    id: 42,
    username: 'oauth_tester',
    langCode: 'zh-CN',
    token: 'mock-oauth-token',
  };
  const fulfillOk = (data: unknown) => ({
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data, message: 'ok' }),
  });

  await page.route('**/api/v1/admin/system/auth/oauth/login/callback', async (route) => {
    await route.fulfill(fulfillOk({ userObj }));
  });
  await page.route('**/api/v1/admin/system/menu/tree', async (route) => {
    await route.fulfill(fulfillOk([]));
  });
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', async (route) => {
    await route.fulfill(fulfillOk({ permissions: [] }));
  });
  await page.route('**/api/v1/admin/system/auth/check', async (route) => {
    await route.fulfill(fulfillOk(true));
  });
  await page.route('**/api/v1/admin/system/auth/profile', async (route) => {
    await route.fulfill(
      fulfillOk({
        userObj: {
          id: userObj.id,
          username: userObj.username,
          langCode: userObj.langCode,
          isEnabled: true,
          remark: 'OAuth acceptance account',
          regionObj: null,
          departmentObj: null,
          roleArr: [],
          creatorId: 1,
          createTimeUtc: 1,
          updaterId: null,
          updateTimeUtc: null,
          githubUsername: null,
          oauthBindings: [],
        },
      }),
    );
  });

  await page.goto('/oauth/callback?code=mock-code&state=mock-state');

  await expect(page).toHaveURL(/#\/me$/);
  await expect(page.getByText('oauth_tester', { exact: true }).first()).toBeVisible();
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => Object.keys(JSON.parse(localStorage.userInfo)).sort());
      } catch {
        return [];
      }
    })
    .toEqual(['id', 'langCode', 'token', 'username']);
});
