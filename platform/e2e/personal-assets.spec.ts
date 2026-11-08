import { test, expect, type Page } from '@playwright/test';
import type { AssetOverview } from '../packages/ui/src/api/personal/asset';

const prefix = '**/api/v1/personal/asset/';
function overview(count = 3): AssetOverview {
  return {
    asOfUtc: Date.now(),
    presenceSource: 'unconfigured',
    assets: Array.from({ length: count }, (_, i) => ({
      assetId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      name: `合成资产 ${i + 1}`,
      category: i === 0 ? 'host' : 'disk',
      inventoryStatus: 'active',
      hostAssetId: null,
      placement: { site: null, floor: null, version: null, updateTimeUtc: null },
      presence: {
        status: 'unknown',
        basis: 'not_connected',
        lastHeartbeatTimeUtc: null,
        observedTimeUtc: null,
        expiresTimeUtc: null,
      },
    })),
  };
}
async function install(page: Page, data = overview()) {
  await page.route(`${prefix}overview`, (route) => route.fulfill({ json: { ok: true, data } }));
}
async function open(page: Page) {
  await page.goto('/#/personal/asset');
  await expect(page.getByRole('heading', { name: /资产清单/ })).toBeVisible();
}
async function demo(page: Page) {
  await open(page);
  await page.getByRole('switch', { name: '演示' }).check();
  await expect(page.getByText(/演示数据 · 合成设备与状态/)).toBeVisible();
}

test('real-shaped unconfigured data stays unknown and unlocated', async ({ page }) => {
  await install(page);
  await open(page);
  await expect(page.getByRole('button', { name: '待定位 3', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看资产 合成资产 1', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await expect(dialog.getByText('未接通在线状态来源')).toBeVisible();
  await expect(dialog.getByText('未知', { exact: true })).toBeVisible();
  await expect(dialog.getByText('在线', { exact: true })).toHaveCount(0);
});

test('save confirms only a successful response and keeps UUID and version', async ({ page }) => {
  const data = overview();
  await install(page, data);
  let writes = 0;
  await page.route(`${prefix}place`, async (route) => {
    const input: unknown = route.request().postDataJSON();
    expect(input).toMatchObject({
      assetId: data.assets[0].assetId,
      tenantId: 1,
      site: 'OpenMind',
      floor: 4,
      expectedVersion: null,
    });
    writes++;
    await route.fulfill({
      json: {
        ok: true,
        data: { site: 'OpenMind', floor: 4, version: 1, updateTimeUtc: Date.now() },
      },
    });
  });
  await open(page);
  await page.getByRole('button', { name: '查看资产 合成资产 1', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await dialog.getByRole('combobox', { name: '场地', exact: true }).click();
  await page.getByRole('option', { name: 'OpenMind', exact: true }).click();
  await dialog.getByRole('combobox', { name: '楼层', exact: true }).click();
  await page.getByRole('option', { name: '4F', exact: true }).click();
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('展示位置已保存', { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  await expect(dialog.getByText(data.assets[0].assetId, { exact: true })).toBeVisible();
});

for (const lostResponse of [false, true]) {
  test(`save ${lostResponse ? 'unknown outcome' : 'conflict'} never reports success or retries`, async ({
    page,
  }) => {
    await install(page);
    let writes = 0;
    await page.route(`${prefix}place`, async (route) => {
      writes++;
      if (lostResponse) await route.abort('failed');
      else
        await route.fulfill({
          status: 409,
          json: {
            ok: false,
            data: { code: 'PERSONAL_ASSET_STATE_CONFLICT' },
            message: 'synthetic conflict',
          },
        });
    });
    await open(page);
    await page.getByRole('button', { name: '查看资产 合成资产 1', exact: true }).click();
    await page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(
      page.getByText(
        lostResponse
          ? '暂时无法确认位置是否已保存，请刷新查看。'
          : '位置未保存；记录或权限可能已变化，请刷新后重试。',
      ),
    ).toBeVisible();
    await expect(page.getByText('展示位置已保存', { exact: true })).toHaveCount(0);
    expect(writes).toBe(1);
    expect(await page.getByText('synthetic conflict', { exact: true }).count()).toBe(0);
  });
}

test('explicit demo has four floors, stale evidence unknown, and virtual children only under a host', async ({
  page,
}) => {
  await demo(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '4F', exact: true }).click();
  await expect(remote.getByRole('button', { name: /Expired observation, 4F, 未知/ })).toBeVisible();
  await page.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await expect(dialog.getByRole('button', { name: /Virtual machine/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Container/ })).toBeVisible();
  await dialog.getByRole('button', { name: /Virtual machine/ }).click();
  await expect(dialog.getByText('虚拟资源跟随所属主机展示。')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '更新演示位置' })).toHaveCount(0);
});

test('mobile touch, keyboard and reduced motion preserve accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '3F', exact: true }).click();
  const marker = remote.getByRole('button', { name: /Workstation.*3F, 失联/ });
  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '资产详情' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '资产详情' })).toHaveCount(0);
  expect(
    await page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth),
  ).toBe(true);
  const lines = page.locator('svg path[d="M0 7H180"]');
  await expect(lines).toHaveCount(2);
  expect(
    await lines.evaluateAll((nodes) =>
      nodes.every((node) => getComputedStyle(node).animationName === 'none'),
    ),
  ).toBe(true);
});

test('all devices remain reachable when the scene only shows representative markers', async ({
  page,
}) => {
  const data = overview(32);
  data.assets.forEach((asset) => {
    asset.placement = { site: 'OpenMind', floor: 2, version: 1, updateTimeUtc: Date.now() };
  });
  await install(page, data);
  await open(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '2F', exact: true }).click();
  await remote.getByRole('button', { name: '2F · 查看 32 台', exact: true }).click();
  await page.getByRole('textbox', { name: '搜索资产名称' }).fill('合成资产 32');
  await expect(
    page.getByRole('button', { name: '查看资产 合成资产 32', exact: true }),
  ).toBeVisible();
});

test('read failure stays a failure, never silently switches to demo', async ({ page }) => {
  await page.route(`${prefix}overview`, (route) =>
    route.fulfill({ status: 503, json: { ok: false, message: 'synthetic unavailable' } }),
  );
  await page.goto('/#/personal/asset');
  await expect(page.getByText(/资产加载失败/)).toBeVisible();
  await expect(page.getByRole('switch', { name: '演示' })).not.toBeChecked();
  await expect(page.getByRole('button', { name: /Demo · Atlas/ })).toHaveCount(0);
});

test('HTTP 200 business failure is shown locally once', async ({ page }) => {
  await install(page);
  let writes = 0;
  await page.route(`${prefix}place`, (route) => {
    writes++;
    return route.fulfill({
      json: {
        ok: false,
        data: { code: 'PERSONAL_ASSET_STATE_CONFLICT' },
        message: 'synthetic conflict',
      },
    });
  });
  await open(page);
  await page.getByRole('button', { name: '查看资产 合成资产 1', exact: true }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('位置未保存；记录或权限可能已变化，请刷新后重试。')).toHaveCount(1);
  expect(writes).toBe(1);
  await expect(page.getByText('synthetic conflict', { exact: true })).toHaveCount(0);
});

test('switching identity discards an earlier successful response', async ({ page }) => {
  const oldData = overview();
  const newData = overview(1);
  newData.assets[0].name = '新账号合成资产';
  let release: (() => void) | undefined;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let queries = 0;
  await page.route(`${prefix}overview`, async (route) => {
    queries++;
    if (queries === 1) {
      await hold;
      await route.fulfill({ json: { ok: true, data: oldData } });
    } else await route.fulfill({ json: { ok: true, data: newData } });
  });
  await page.goto('/#/personal/asset');
  await expect.poll(() => queries).toBe(1);
  await page.evaluate(() => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: 43,
        username: 'other-synthetic',
        token: 'other-synthetic',
        langCode: 'zh-CN',
      }),
    );
    window.dispatchEvent(new Event('hodor:auth-changed'));
  });
  await expect(
    page.getByRole('button', { name: '查看资产 新账号合成资产', exact: true }),
  ).toBeVisible();
  release?.();
  await expect(page.getByRole('button', { name: '查看资产 合成资产 1', exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: '查看资产 新账号合成资产', exact: true }),
  ).toBeVisible();
});

test('demo online evidence becomes unknown at the exact displayed lease boundary', async ({
  page,
}) => {
  const start = new Date('2030-01-01T00:00:00.000Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await demo(page);
  const life = page.getByRole('region', { name: 'OpenLife 房屋空间示意' });
  await expect(
    life.getByRole('button', { name: 'Demo · Atlas, 1F, 在线', exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(599_999);
  await expect(
    life.getByRole('button', { name: 'Demo · Atlas, 1F, 在线', exact: true }),
  ).toBeVisible();
  await page.clock.runFor(1);
  await expect(
    life.getByRole('button', { name: 'Demo · Atlas, 1F, 未知', exact: true }),
  ).toBeVisible();
});

test('capture a shareable synthetic desktop preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await demo(page);
  await page
    .getByRole('region', { name: 'OpenMind 房屋空间示意' })
    .getByRole('button', { name: '4F', exact: true })
    .click();
  await page.screenshot({ path: 'test-results/personal-assets-preview.png', fullPage: true });
});
