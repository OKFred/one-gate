import { expect, test } from '@playwright/test';
import { readE2EEnvironment } from '../support/test-environment.js';

const environment = readE2EEnvironment();

test.skip(!environment.mockAuth, 'Set HODOR_E2E_MOCK_AUTH=true for the mock auth UI suite.');

const fulfillOk = (data: unknown) => ({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, data, message: 'ok' }),
});

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/admin/i18n/translation/listAll', async (route) => {
    await route.fulfill(fulfillOk([]));
  });
});

for (const logoutOutcome of ['success', 'failure'] as const) {
  test(`TOTP gate can log out without a code when cookie cleanup ${logoutOutcome}`, async ({
    page,
    context,
  }) => {
    let logoutRequests = 0;
    let protectedRequests = 0;
    await page.addInitScript(() => {
      if (sessionStorage.getItem('logout-fixture-created')) return;
      sessionStorage.setItem('logout-fixture-created', 'true');
      sessionStorage.setItem('hodor:primary-auth-return-target', `${location.origin}/enterprise/`);
      localStorage.setItem(
        'userInfo',
        JSON.stringify({ id: 46, username: 'gate_user', langCode: 'zh-CN', token: 'gate-token' }),
      );
    });
    await context.addCookies([
      { name: 'test-gate-cookie', value: 'old-session', url: environment.baseUrl },
    ]);
    await page.route('**/api/v1/admin/system/auth/gate/status', (route) =>
      route.fulfill(fulfillOk({ verified: false, expiresAtUtc: null })),
    );
    await page.route('**/api/v1/admin/system/auth/gate/logout', async (route) => {
      logoutRequests += 1;
      expect(route.request().postDataJSON()).toEqual({});
      expect(route.request().headers().authorization).toBe('Bearer gate-token');
      if (logoutOutcome === 'failure') {
        await route.fulfill({ status: 503, ...fulfillOk(null) });
      } else {
        await route.fulfill({
          ...fulfillOk({ verified: false, expiresAtUtc: null }),
          headers: { 'set-cookie': 'test-gate-cookie=; Max-Age=0; Path=/' },
        });
      }
    });
    await page.route(
      /\/api\/v1\/admin\/system\/(menu\/tree|auth\/getButtonPermission|auth\/sso\/account\/callback)$/,
      async (route) => {
        protectedRequests += 1;
        await route.fulfill(fulfillOk([]));
      },
    );

    await page.goto('/#/sso/callback?code=abandoned-code&state=abandoned-state&intent=bind');
    await expect(
      page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /退出登录|Log out/i }).click();
    await expect(page).toHaveURL(`${environment.baseUrl}/#/login`);
    await expect(page.getByLabel(/用户名|Username/i)).toBeVisible();
    expect(logoutRequests).toBe(1);
    expect(protectedRequests).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('userInfo'))).toBeNull();
    expect(
      await page.evaluate(() => sessionStorage.getItem('hodor:primary-auth-return-target')),
    ).toBeNull();
    if (logoutOutcome === 'success') {
      expect((await context.cookies()).some((cookie) => cookie.name === 'test-gate-cookie')).toBe(
        false,
      );
    }
    await page.reload();
    await expect(page.getByLabel(/用户名|Username/i)).toBeVisible();
    expect(protectedRequests).toBe(0);
  });
}

test('TOTP logout discards a transferred token and prevents verification while signing out', async ({
  page,
}) => {
  let verifyRequests = 0;
  let releaseLogout: (() => void) | undefined;
  const logoutPending = new Promise<void>((resolve) => {
    releaseLogout = resolve;
  });
  await page.route('**/api/v1/admin/system/auth/gate/status', (route) =>
    route.fulfill(fulfillOk({ verified: false, expiresAtUtc: null })),
  );
  await page.route('**/api/v1/admin/system/auth/gate/logout', async (route) => {
    await logoutPending;
    await route.fulfill(fulfillOk({ verified: false, expiresAtUtc: null }));
  });
  await page.route('**/api/v1/admin/system/auth/gate/verify', async (route) => {
    verifyRequests += 1;
    await route.fulfill(fulfillOk({ verified: true, expiresAtUtc: null }));
  });
  await page.goto('/?token=transferred-token#/login');
  await page.getByLabel(/动态验证码|Authenticator code/i).fill('123456');
  await page.getByRole('button', { name: /退出登录|Log out/i }).click();
  await expect(
    page.getByRole('button', { name: /验证并进入系统|Verify and continue/i }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: /退出登录|Log out/i })).toBeDisabled();
  releaseLogout?.();
  await expect(page).toHaveURL(`${environment.baseUrl}/#/login`);
  await expect(page.getByLabel(/用户名|Username/i)).toBeVisible();
  expect(verifyRequests).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('userInfo'))).toBeNull();
});

test('login page only exposes password and Identity Center', async ({ page }) => {
  await page.route('**/api/v1/admin/system/auth/sso/login/url', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      redirectUri: `${environment.baseUrl}/sso/callback?intent=login`,
    });
    await route.fulfill(fulfillOk({ url: `${environment.baseUrl}/mock-identity-center` }));
  });

  await page.goto('/#/login');
  await expect(page.getByLabel(/用户名|Username/i)).toBeVisible();
  await expect(page.getByLabel(/^密码$|^Password$/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /GitHub/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /飞书|Feishu/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /微信|WeChat/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /忘记密码|Forgot password/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /注册|Sign up/i })).toHaveCount(0);

  await page.getByRole('button', { name: /统一身份中心|Identity Center/i }).click();
  await expect(page).toHaveURL(`${environment.baseUrl}/mock-identity-center`);
});

test('password login establishes only the primary session before TOTP', async ({ page }) => {
  let protectedRequests = 0;
  await page.route('**/api/v1/admin/system/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      username: 'tester',
      password: 'cGFzc3dvcmQ=',
    });
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

test('Identity Center login callback stops at the shared TOTP gate', async ({ page }) => {
  const userObj = {
    id: 43,
    username: 'sso_tester',
    langCode: 'zh-CN',
    token: 'mock-sso-token',
  };
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

test('binding callback waits until an expired TOTP gate is restored', async ({ page }) => {
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
        expiresAtUtc: gateVerified ? '2026-09-02T00:00:00.000Z' : null,
      }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/gate/verify', async (route) => {
    gateVerified = true;
    await route.fulfill(fulfillOk({ verified: true, expiresAtUtc: '2026-09-02T00:00:00.000Z' }));
  });
  await page.route('**/api/v1/admin/system/auth/sso/account/callback', async (route) => {
    bindingCallbacks += 1;
    expect(route.request().postDataJSON()).toEqual({ code: 'bind-code', state: 'bind-state' });
    await route.fulfill(fulfillOk({ message: 'SSO 账号绑定成功' }));
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

  await page.goto('/sso/callback?code=bind-code&state=bind-state&intent=bind');
  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toBeVisible();
  expect(bindingCallbacks).toBe(0);
  await page.getByLabel(/动态验证码|Authenticator code/i).fill('123456');
  await page.getByRole('button', { name: /验证并进入系统|Verify and continue/i }).click();
  await expect.poll(() => bindingCallbacks).toBe(1);
  await expect(page).toHaveURL(/#\/me$/);
});

test('successful Identity Center login preserves the SPA after TOTP', async ({ page }) => {
  const userObj = {
    id: 42,
    username: 'sso_tester',
    langCode: 'zh-CN',
    token: 'mock-sso-token',
  };
  let menuRequests = 0;
  let permissionRequests = 0;
  let gateStatusRequests = 0;
  let tokenCheckRequests = 0;
  let gateVerified = false;

  await page.addInitScript(() => {
    sessionStorage.setItem('chunk_reload_attempted', '1');
  });
  await page.route('**/api/v1/admin/system/auth/sso/login/callback', async (route) => {
    await route.fulfill(fulfillOk({ userObj }));
  });
  await page.route('**/api/v1/admin/system/menu/tree', async (route) => {
    menuRequests += 1;
    await route.fulfill(
      fulfillOk([
        {
          id: 1,
          name: 'sidebar.menu.home',
          path: '/home',
          icon: 'material-symbols:home',
          children: [],
        },
        {
          id: 2,
          name: 'sidebar.menu.me',
          path: '/me',
          icon: 'material-symbols:person',
          children: [],
        },
      ]),
    );
  });
  await page.route('**/api/v1/admin/system/auth/getButtonPermission', async (route) => {
    permissionRequests += 1;
    await route.fulfill(fulfillOk({ permissions: [] }));
  });
  await page.route('**/api/v1/admin/system/auth/gate/status', async (route) => {
    gateStatusRequests += 1;
    await route.fulfill(
      fulfillOk({
        verified: gateVerified,
        expiresAtUtc: gateVerified ? '2026-09-02T00:00:00.000Z' : null,
      }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/gate/verify', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ code: '123456' });
    gateVerified = true;
    await route.fulfill(fulfillOk({ verified: true, expiresAtUtc: '2026-09-02T00:00:00.000Z' }));
  });
  await page.route('**/api/v1/admin/system/auth/check', async (route) => {
    tokenCheckRequests += 1;
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
          remark: 'SSO acceptance account',
          regionObj: null,
          departmentObj: null,
          roleArr: [],
          creatorId: 1,
          createTimeUtc: 1,
          updaterId: null,
          updateTimeUtc: null,
        },
      }),
    );
  });
  await page.route('**/api/v1/admin/system/auth/sso/binding/summary', async (route) => {
    await route.fulfill(
      fulfillOk({
        bound: true,
        issuer: 'https://sso.example.com',
        tenantId: 'tenant-1',
        membershipId: 'membership-1',
        clientId: 'hodor-client',
        amr: ['local'],
        scope: ['openid'],
        createTimeUtc: 1,
        updateTimeUtc: null,
      }),
    );
  });

  await page.goto('/sso/callback?code=mock-code&state=mock-state&intent=login');
  await expect(
    page.getByRole('heading', { name: /二次安全验证|Security verification/i }),
  ).toBeVisible();
  expect(menuRequests).toBe(0);
  expect(permissionRequests).toBe(0);
  await page.getByLabel(/动态验证码|Authenticator code/i).fill('123456');
  await page.getByRole('button', { name: /验证并进入系统|Verify and continue/i }).click();

  await expect(page).toHaveURL(/#\/home$/);
  await expect.poll(() => menuRequests).toBeGreaterThan(0);
  await expect.poll(() => permissionRequests).toBeGreaterThan(0);
  await expect.poll(() => tokenCheckRequests).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const requestsAfterInitialLoad = {
    gateStatus: gateStatusRequests,
    menu: menuRequests,
    permission: permissionRequests,
    tokenCheck: tokenCheckRequests,
  };
  const layoutMarker = 'auth-boundary-stable';
  await page
    .locator('header')
    .first()
    .evaluate((element, marker) => {
      element.setAttribute('data-e2e-layout-marker', marker);
    }, layoutMarker);
  const stableLayout = page.locator(`[data-e2e-layout-marker="${layoutMarker}"]`);

  await page.getByText('个人资料', { exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/#\/me$/);
  await expect(stableLayout).toBeVisible();
  await page.waitForTimeout(500);
  expect({
    gateStatus: gateStatusRequests,
    menu: menuRequests,
    permission: permissionRequests,
    tokenCheck: tokenCheckRequests,
  }).toEqual(requestsAfterInitialLoad);

  await page.getByText('主页', { exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/#\/home$/);
  await expect(stableLayout).toBeVisible();
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
