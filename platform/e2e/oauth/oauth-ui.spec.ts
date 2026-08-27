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
  await expect(page.getByRole('button', { name: /统一身份中心|Identity Center/i })).toBeVisible();
  await page.getByRole('button', { name: /飞书|Feishu/i }).click();
  await expect(page).toHaveURL(`${environment.baseUrl}/mock-feishu`);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => /feishu|oauth.*profile/i.test(key)),
    ),
  ).toBe(false);
});

test('password login establishes only the primary session before TOTP', async ({ page }) => {
  const fulfillOk = (data: unknown) => ({
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data, message: 'ok' }),
  });
  let protectedRequests = 0;
  await page.route('**/api/v1/admin/system/auth/login', async (route) => {
    const body: unknown = route.request().postDataJSON();
    expect(body).toEqual({ username: 'tester', password: 'cGFzc3dvcmQ=' });
    await route.fulfill(
      fulfillOk({
        userObj: { id: 44, username: 'tester', langCode: 'zh-CN', token: 'password-token' },
      }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/gate/status', async (route) => {
    await route.fulfill(fulfillOk({ verified: false, expiresAtUtc: null }));
  });
  await page.route('**/api/v1/admin/system/menu/tree', async (route) => {
    protectedRequests += 1;
    await route.fulfill(fulfillOk([]));
  });
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', async (route) => {
    protectedRequests += 1;
    await route.fulfill(fulfillOk({ permissions: [] }));
  });

  await page.goto('/#/login');
  await page.getByLabel(/用户名|Username/i).fill('tester');
  await page.getByLabel(/^密码$|^Password$/i).fill('password');
  await page.getByRole('button', { name: /^登录$|^Sign in$/i }).click();
  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toBeVisible();
  expect(protectedRequests).toBe(0);
});

test('one-sso login callback also stops at the shared TOTP gate', async ({ page }) => {
  const userObj = {
    id: 43,
    username: 'sso_tester',
    langCode: 'zh-CN',
    token: 'mock-sso-token',
  };
  const fulfillOk = (data: unknown) => ({
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data, message: 'ok' }),
  });
  let protectedRequests = 0;
  await page.route('**/api/v1/admin/system/auth/sso/login/callback', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ code: 'sso-code', state: 'sso-state' });
    await route.fulfill(fulfillOk({ userObj }));
  });
  await page.route('**/api/v1/admin/system/auth/gate/status', async (route) => {
    await route.fulfill(fulfillOk({ verified: false, expiresAtUtc: null }));
  });
  await page.route('**/api/v1/admin/system/menu/tree', async (route) => {
    protectedRequests += 1;
    await route.fulfill(fulfillOk([]));
  });
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', async (route) => {
    protectedRequests += 1;
    await route.fulfill(fulfillOk({ permissions: [] }));
  });

  await page.goto('/sso/callback?code=sso-code&state=sso-state&intent=login');
  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toBeVisible();
  expect(protectedRequests).toBe(0);
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

test('binding callback URL is preserved until an expired TOTP gate is restored', async ({
  page,
}) => {
  const fulfillOk = (data: unknown) => ({
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data, message: 'ok' }),
  });
  let gateVerified = false;
  let bindingCallbacks = 0;
  await page.addInitScript(() => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({ id: 45, username: 'bound_user', langCode: 'zh-CN', token: 'bound-token' }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/gate/status', async (route) => {
    await route.fulfill(
      fulfillOk({
        verified: gateVerified,
        expiresAtUtc: gateVerified ? '2026-08-29T00:00:00.000Z' : null,
      }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/gate/verify', async (route) => {
    gateVerified = true;
    await route.fulfill(fulfillOk({ verified: true, expiresAtUtc: '2026-08-29T00:00:00.000Z' }));
  });
  await page.route('**/api/v1/admin/system/auth/oauth/account/callback', async (route) => {
    bindingCallbacks += 1;
    expect(route.request().postDataJSON()).toEqual({ code: 'bind-code', state: 'bind-state' });
    await route.fulfill(fulfillOk({ provider: 'github', unbound: false }));
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

  await page.goto('/oauth/callback?code=bind-code&state=bind-state');
  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toBeVisible();
  expect(bindingCallbacks).toBe(0);
  await page.getByLabel(/动态验证码|Authenticator code/i).fill('123456');
  await page.getByRole('button', { name: /验证并进入系统|Verify and continue/i }).click();
  await expect.poll(() => bindingCallbacks).toBe(1);
  await expect(page).toHaveURL(/#\/me$/);
});

test('successful OAuth login stops at TOTP before loading menus and permissions', async ({
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
  let menuRequests = 0;
  let permissionRequests = 0;
  let gateVerified = false;

  await page.route('**/api/v1/admin/system/auth/oauth/login/callback', async (route) => {
    await route.fulfill(fulfillOk({ userObj }));
  });
  await page.route('**/api/v1/admin/system/menu/tree', async (route) => {
    menuRequests += 1;
    await route.fulfill(fulfillOk([]));
  });
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', async (route) => {
    permissionRequests += 1;
    await route.fulfill(fulfillOk({ permissions: [] }));
  });
  await page.route('**/api/v1/admin/system/auth/gate/status', async (route) => {
    await route.fulfill(
      fulfillOk({
        verified: gateVerified,
        expiresAtUtc: gateVerified ? '2026-08-29T00:00:00.000Z' : null,
      }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/gate/verify', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    gateVerified = true;
    await route.fulfill(fulfillOk({ verified: true, expiresAtUtc: '2026-08-29T00:00:00.000Z' }));
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

  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toBeVisible();
  expect(menuRequests).toBe(0);
  expect(permissionRequests).toBe(0);
  await page.getByLabel(/动态验证码|Authenticator code/i).fill('123456');
  await page.getByRole('button', { name: /验证并进入系统|Verify and continue/i }).click();

  await expect(page).toHaveURL(/#\/home$/);
  await expect.poll(() => menuRequests).toBe(1);
  await expect.poll(() => permissionRequests).toBe(1);
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => Object.keys(JSON.parse(localStorage.userInfo)).sort());
      } catch {
        return [];
      }
    })
    .toEqual(['id', 'langCode', 'token', 'username']);

  await page.reload();
  await expect.poll(() => menuRequests).toBe(2);
  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toHaveCount(0);
});
