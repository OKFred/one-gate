import { test, expect, type Locator, type Page } from '@playwright/test';
import type { AssetOverview } from '../packages/ui/src/api/personal/asset';

const prefix = '**/api/v1/personal/asset/';
const demoPlacedIds = [1, 2, 3, 4, 5, 6, 7, 9].map(
  (id) => `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
);
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
async function showSpace(page: Page) {
  await page
    .getByRole('group', { name: '资产视图', exact: true })
    .getByRole('button', { name: '空间', exact: true })
    .click();
  await expect(page.locator('#personal-asset-list')).toBeHidden();
}
async function showList(page: Page) {
  await page
    .getByRole('group', { name: '资产视图', exact: true })
    .getByRole('button', { name: '列表', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /资产清单/ })).toBeVisible();
  await expect(page.getByTestId('asset-three-canvas')).toHaveCount(0);
}
async function showTopology(page: Page): Promise<Locator> {
  await page
    .getByRole('group', { name: '资产视图', exact: true })
    .getByRole('button', { name: '拓扑', exact: true })
    .click();
  await expect(page.locator('#personal-asset-list')).toBeHidden();
  const topology = page.getByTestId('asset-topology');
  await expect(topology).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await topology.scrollIntoViewIfNeeded();
  return topology;
}
async function topologyViewport(
  topology: Locator,
): Promise<{ x: number; y: number; zoom: number }> {
  return topology.locator('.react-flow__viewport').evaluate((element) => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { x: transform.e, y: transform.f, zoom: transform.a };
  });
}

type CameraPose = { position: number[]; target: number[]; zoom: number };
function isVector(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item: unknown) => typeof item === 'number' && Number.isFinite(item))
  );
}
async function cameraPose(canvas: Locator): Promise<CameraPose> {
  const value: unknown = JSON.parse((await canvas.getAttribute('data-camera')) ?? 'null');
  if (
    !value ||
    typeof value !== 'object' ||
    !('position' in value) ||
    !isVector(value.position) ||
    !('target' in value) ||
    !isVector(value.target) ||
    !('zoom' in value) ||
    typeof value.zoom !== 'number' ||
    !Number.isFinite(value.zoom)
  )
    throw new Error('The rendered scene did not expose a finite camera pose');
  return { position: value.position, target: value.target, zoom: value.zoom };
}
async function threeCanvas(page: Page): Promise<Locator> {
  const canvas = page.getByTestId('asset-three-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('[data-render-state]')).toHaveAttribute('data-render-state', 'ready');
  return canvas;
}
async function projectedAssetIds(canvas: Locator): Promise<string[]> {
  const value: unknown = JSON.parse((await canvas.getAttribute('data-pick-targets')) ?? 'null');
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item: unknown): item is { assetId: string } =>
        typeof item === 'object' &&
        item !== null &&
        'assetId' in item &&
        typeof item.assetId === 'string',
    )
    .map((item) => item.assetId)
    .sort();
}
async function clickProjectedAsset(page: Page, canvas: Locator, assetId: string) {
  await canvas.scrollIntoViewIfNeeded();
  const value: unknown = JSON.parse((await canvas.getAttribute('data-pick-targets')) ?? 'null');
  if (!Array.isArray(value))
    throw new Error('The rendered scene did not expose device projections');
  const target = value.find(
    (item: unknown): item is { assetId: string; x: number; y: number } =>
      typeof item === 'object' &&
      item !== null &&
      'assetId' in item &&
      item.assetId === assetId &&
      'x' in item &&
      typeof item.x === 'number' &&
      Number.isFinite(item.x) &&
      'y' in item &&
      typeof item.y === 'number' &&
      Number.isFinite(item.y),
  );
  const box = await canvas.boundingBox();
  if (!target || !box) throw new Error('The requested asset has no visible scene projection');
  expect(target.x).toBeGreaterThan(0);
  expect(target.x).toBeLessThan(box.width);
  expect(target.y).toBeGreaterThan(0);
  expect(target.y).toBeLessThan(box.height);
  // Click the real canvas: this must pass through the production Raycaster handler.
  await page.mouse.click(box.x + target.x, box.y + target.y);
}

test('real-shaped unconfigured data stays unknown and unlocated', async ({ page }) => {
  await install(page);
  await open(page);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(
    page
      .getByRole('group', { name: '资产视图', exact: true })
      .getByRole('button', { name: '列表', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '待定位 3', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: '搜索资产名称' }).fill('合成资产 1');
  await expect(page.getByRole('button', { name: '查看资产 合成资产 2', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: '查看资产 合成资产 1', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await expect(dialog.getByText('未接通在线状态来源')).toBeVisible();
  await expect(dialog.getByText('未知', { exact: true })).toBeVisible();
  await expect(dialog.getByText('在线', { exact: true })).toHaveCount(0);
});

test('switching between list and space retains list filters and the selected floor', async ({
  page,
}) => {
  await demo(page);
  await page.getByRole('textbox', { name: '搜索资产名称' }).fill('Compute');
  await page.getByRole('combobox', { name: '在线状态', exact: true }).click();
  await page.getByRole('option', { name: '离线', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Compute', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }),
  ).toHaveCount(0);
  await showSpace(page);
  await threeCanvas(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '3F', exact: true }).click();
  await showList(page);
  await expect(page.getByRole('textbox', { name: '搜索资产名称' })).toHaveValue('Compute');
  await expect(page.getByRole('combobox', { name: '在线状态', exact: true })).toHaveText('离线');
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Compute', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }),
  ).toHaveCount(0);
  await showSpace(page);
  await threeCanvas(page);
  await expect(remote.getByRole('button', { name: '3F', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('showing a floor switches to the filtered list and transfers keyboard focus', async ({
  page,
}) => {
  await demo(page);
  await showSpace(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '2F', exact: true }).click();
  const showFloor = remote.getByRole('button', { name: '2F · 查看 1 台', exact: true });
  await showFloor.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: /资产清单/ })).toBeVisible();
  await expect(page.getByTestId('asset-three-canvas')).toHaveCount(0);
  await expect(page.locator('#personal-asset-list')).toBeFocused();
  await expect(page.getByRole('button', { name: 'OpenMind · 2F', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Compute', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Relay', exact: true }),
  ).toHaveCount(0);
});

test('the 2D topology works without WebGL and shows only physical devices including unlocated assets', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await demo(page);
  const topology = await showTopology(page);
  await expect(topology.getByRole('button', { name: /^查看资产 / })).toHaveCount(9);
  await expect(
    topology.getByRole('button', { name: '查看资产 Demo · Unlocated', exact: true }),
  ).toBeVisible();
  await expect(topology.getByRole('button', { name: /Virtual machine|Container/ })).toHaveCount(0);
  await expect(page.getByTestId('asset-three-canvas')).toHaveCount(0);
});

test('topology device pointer and keyboard activation open the correct UUID while dragging does not', async ({
  page,
}) => {
  await demo(page);
  const topology = await showTopology(page);
  const atlas = topology.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true });
  await atlas.click();
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await expect(
    dialog.getByText('00000000-0000-4000-8000-000000000001', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  const unlocated = topology.getByRole('button', {
    name: '查看资产 Demo · Unlocated',
    exact: true,
  });
  await unlocated.focus();
  await page.keyboard.press('Enter');
  await expect(
    dialog.getByText('00000000-0000-4000-8000-000000000008', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await topology.getByRole('button', { name: '适配拓扑', exact: true }).click();
  await expect(atlas).toBeInViewport();
  const box = await atlas.boundingBox();
  if (!box) throw new Error('The actual topology device button has no bounds');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 45, { steps: 10 });
  await page.mouse.up();
  await expect(dialog).toHaveCount(0);
});

test('topology pan, wheel zoom and fit controls change the actual viewport while list filters persist', async ({
  page,
}) => {
  await demo(page);
  await page.getByRole('textbox', { name: '搜索资产名称' }).fill('Compute');
  const topology = await showTopology(page);
  await topology.getByRole('button', { name: '适配拓扑', exact: true }).click();
  const pane = topology.locator('.react-flow__pane');
  const box = await pane.boundingBox();
  if (!box) throw new Error('The actual topology pane has no bounds');
  const initial = await topologyViewport(topology);
  await page.mouse.move(box.x + box.width - 18, box.y + 18);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 128, box.y + 83, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const view = await topologyViewport(topology);
      return { x: view.x, y: view.y };
    })
    .not.toEqual({ x: initial.x, y: initial.y });
  const panned = await topologyViewport(topology);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -250);
  await expect
    .poll(async () => (await topologyViewport(topology)).zoom)
    .toBeGreaterThan(panned.zoom);
  const zoomed = await topologyViewport(topology);
  await topology.getByRole('button', { name: '拓扑放大', exact: true }).click();
  await expect
    .poll(async () => (await topologyViewport(topology)).zoom)
    .toBeGreaterThan(zoomed.zoom);
  const enlarged = await topologyViewport(topology);
  await topology.getByRole('button', { name: '拓扑缩小', exact: true }).click();
  await expect
    .poll(async () => (await topologyViewport(topology)).zoom)
    .toBeLessThan(enlarged.zoom);
  await topology.getByRole('button', { name: '适配拓扑', exact: true }).click();
  await expect(
    topology.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }),
  ).toBeInViewport();
  await expect(
    topology.getByRole('button', { name: '查看资产 Demo · Unlocated', exact: true }),
  ).toBeInViewport();
  await showList(page);
  await expect(page.getByRole('textbox', { name: '搜索资产名称' })).toHaveValue('Compute');
  await expect(
    page.getByRole('button', { name: '查看资产 Demo · Compute', exact: true }),
  ).toBeVisible();
});

test('the topology remains 2D on mobile, follows the theme and expires stale device evidence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2030-01-01T00:00:00.000Z') });
  await demo(page);
  const topology = await showTopology(page);
  await expect(topology.getByRole('button', { name: /^查看资产 / })).toHaveCount(9);
  const atlas = topology.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true });
  await expect(atlas).toContainText('在线');
  const background = () =>
    page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  const lightBackground = await background();
  await page.getByTestId('preview-theme-toggle').click();
  await expect.poll(background).not.toBe(lightBackground);
  await expect(topology).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(
    await page.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.clock.fastForward(600_001);
  await expect(atlas).toContainText('未知');
  await expect(atlas).not.toContainText('在线');
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
  await showSpace(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '4F', exact: true }).click();
  await expect(remote.getByRole('button', { name: /Expired observation, 4F, 未知/ })).toBeVisible();
  await showList(page);
  await page.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await expect(dialog.getByRole('button', { name: /Virtual machine/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Container/ })).toBeVisible();
  await dialog.getByRole('button', { name: /Virtual machine/ }).click();
  await expect(dialog.getByText('虚拟资源跟随所属主机展示。')).toBeVisible();
  await expect(dialog.getByRole('button', { name: '更新演示位置' })).toHaveCount(0);
});

test('mobile layout, keyboard and reduced motion preserve accessible controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo(page);
  await showSpace(page);
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
  const canvas = await threeCanvas(page);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
});

test('all current-floor devices remain reachable in a large asset list', async ({ page }) => {
  const data = overview(32);
  data.assets.forEach((asset) => {
    asset.placement = { site: 'OpenMind', floor: 2, version: 1, updateTimeUtc: Date.now() };
  });
  await install(page, data);
  await open(page);
  await showSpace(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '2F', exact: true }).click();
  const canvas = await threeCanvas(page);
  await expect
    .poll(() => projectedAssetIds(canvas))
    .toEqual(data.assets.map((asset) => asset.assetId).sort());
  const lastId = data.assets[31].assetId;
  await clickProjectedAsset(page, canvas, lastId);
  await expect(
    page.getByRole('dialog', { name: '资产详情' }).getByText(lastId, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await remote.getByRole('button', { name: '2F · 查看 32 台', exact: true }).click();
  await page.getByRole('textbox', { name: '搜索资产名称' }).fill('合成资产 32');
  await expect(
    page.getByRole('button', { name: '查看资产 合成资产 32', exact: true }),
  ).toBeVisible();
});

test('the shared viewport renders real WebGL2 and responds to mouse rotate, zoom and pan', async ({
  page,
}) => {
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => {
      const context = element.getContext('webgl2');
      return (
        !!context &&
        !context.isContextLost() &&
        context.drawingBufferWidth > 0 &&
        context.drawingBufferHeight > 0
      );
    }),
  ).toBe(true);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('The WebGL viewport has no bounds');
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  const initial = await cameraPose(canvas);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 110, y + 35, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await cameraPose(canvas)).position).not.toEqual(initial.position);
  await expect(page.getByRole('dialog', { name: '资产详情' })).toHaveCount(0);

  const rotated = await cameraPose(canvas);
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, -250);
  await expect
    .poll(async () => {
      const pose = await cameraPose(canvas);
      return { position: pose.position, zoom: pose.zoom };
    })
    .not.toEqual({ position: rotated.position, zoom: rotated.zoom });

  const zoomed = await cameraPose(canvas);
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 85, y + 30, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(async () => (await cameraPose(canvas)).target).not.toEqual(zoomed.target);
  await expect(page.getByRole('dialog', { name: '资产详情' })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(false);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
});

test('a short mouse click raycasts a device, and list selection updates the visible floor', async ({
  page,
}) => {
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  await clickProjectedAsset(page, canvas, '00000000-0000-4000-8000-000000000001');
  const dialog = page.getByRole('dialog', { name: '资产详情' });
  await expect(dialog.getByRole('heading', { name: 'Demo · Atlas', exact: true })).toBeVisible();
  await expect(
    dialog.getByText('00000000-0000-4000-8000-000000000001', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await showList(page);
  await page.getByRole('button', { name: '查看资产 Demo · Compute', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Demo · Compute', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await showSpace(page);
  await threeCanvas(page);
  await expect(
    page
      .getByRole('region', { name: 'OpenMind 房屋空间示意' })
      .getByRole('button', { name: '2F', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await clickProjectedAsset(page, canvas, '00000000-0000-4000-8000-000000000005');
  await expect(dialog.getByRole('heading', { name: 'Demo · Compute', exact: true })).toBeVisible();
});

test('transparent building shells keep every floor pickable while selection follows the clicked device', async ({
  page,
}) => {
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await expect(remote.getByRole('button', { name: '1F', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => projectedAssetIds(canvas)).toEqual(demoPlacedIds);
  for (const target of [
    { assetId: '00000000-0000-4000-8000-000000000005', name: 'Demo · Compute', floor: 2 },
    { assetId: '00000000-0000-4000-8000-000000000007', name: 'Demo · Vault', floor: 4 },
  ]) {
    await remote.getByRole('button', { name: '1F', exact: true }).click();
    await expect(remote.getByRole('button', { name: '1F', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await clickProjectedAsset(page, canvas, target.assetId);
    const dialog = page.getByRole('dialog', { name: '资产详情' });
    await expect(dialog.getByRole('heading', { name: target.name, exact: true })).toBeVisible();
    await expect(dialog.getByText(target.assetId, { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      remote.getByRole('button', { name: `${target.floor}F`, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => projectedAssetIds(canvas)).toEqual(demoPlacedIds);
  }
  await clickProjectedAsset(page, canvas, '00000000-0000-4000-8000-000000000004');
  await expect(
    page
      .getByRole('dialog', { name: '资产详情' })
      .getByRole('heading', { name: 'Demo · Relay', exact: true }),
  ).toBeVisible();
});

test('changing theme preserves the real WebGL context, camera and mouse interaction', async ({
  page,
}) => {
  const start = new Date('2030-01-01T00:00:00.000Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('The WebGL viewport has no bounds');
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.5;
  const initial = await cameraPose(canvas);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y + 15, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await cameraPose(canvas)).position).not.toEqual(initial.position);
  const rotated = await cameraPose(canvas);
  const context = await canvas.evaluateHandle((element: HTMLCanvasElement) =>
    element.getContext('webgl2'),
  );
  const background = () =>
    page.locator('body').evaluate((element) => getComputedStyle(element).backgroundColor);
  const lightBackground = await background();
  const lightImage = await canvas.screenshot();
  try {
    await page.getByTestId('preview-theme-toggle').click();
    await expect.poll(background).not.toBe(lightBackground);
    await expect(page.locator('[data-render-state]')).toHaveAttribute('data-render-state', 'ready');
    expect(await cameraPose(canvas)).toEqual(rotated);
    expect(
      await canvas.evaluate((element: HTMLCanvasElement, original) => {
        const current = element.getContext('webgl2');
        return current === original && current !== null && !current.isContextLost();
      }, context),
    ).toBe(true);
    const darkImage = await canvas.screenshot();
    expect(darkImage).not.toEqual(lightImage);

    await page.getByTestId('preview-theme-toggle').click();
    await expect.poll(background).toBe(lightBackground);
    await expect(page.locator('[data-render-state]')).toHaveAttribute('data-render-state', 'ready');
    expect(await cameraPose(canvas)).toEqual(rotated);
    expect(
      await canvas.evaluate((element: HTMLCanvasElement, original) => {
        const current = element.getContext('webgl2');
        return current === original && current !== null && !current.isContextLost();
      }, context),
    ).toBe(true);
    expect(await canvas.screenshot()).not.toEqual(darkImage);

    const latestBounds = await canvas.boundingBox();
    if (!latestBounds) throw new Error('The themed WebGL viewport has no bounds');
    await page.mouse.move(
      latestBounds.x + latestBounds.width * 0.5,
      latestBounds.y + latestBounds.height * 0.5,
    );
    await page.mouse.down();
    await page.mouse.move(
      latestBounds.x + latestBounds.width * 0.5 + 40,
      latestBounds.y + latestBounds.height * 0.5,
      { steps: 6 },
    );
    await page.mouse.up();
    await expect
      .poll(async () => (await cameraPose(canvas)).position)
      .not.toEqual(rotated.position);
    await expect(page.getByRole('dialog', { name: '资产详情' })).toHaveCount(0);
  } finally {
    await context.dispose();
  }
});

test('connections autoplay real pixels without controls even with reduced motion', async ({
  page,
}) => {
  const start = new Date('2030-01-01T00:00:00.000Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  await expect(page.getByRole('button', { name: /连接线动画|播放连线|暂停连线/ })).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
  const pose = await cameraPose(canvas);

  // Advance real renderer frames deterministically; the WebGL canvas remains unstubbed.
  await page.clock.runFor(200);
  const firstFrame = await canvas.screenshot();
  await page.clock.runFor(200);
  const secondFrame = await canvas.screenshot();
  expect(secondFrame).not.toEqual(firstFrame);
  expect(await cameraPose(canvas)).toEqual(pose);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(false);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
  await page.clock.runFor(200);
  expect(await canvas.screenshot()).not.toEqual(secondFrame);
  expect(await cameraPose(canvas)).toEqual(pose);
});

test('connection frames pause for hidden input and dispose when leaving the scene, then autoplay on return', async ({
  page,
}) => {
  const start = new Date('2030-01-01T00:00:00.000Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
  await page.clock.runFor(200);
  const pose = await cameraPose(canvas);
  const original = await canvas.evaluateHandle((element: HTMLCanvasElement) => element);
  try {
    // Exercise the visibility input deterministically; this is not a real background-tab check.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(canvas).toHaveAttribute('data-link-animation', 'paused');
    const hiddenFrame = await canvas.screenshot();
    await page.clock.runFor(300);
    expect(await canvas.screenshot()).toEqual(hiddenFrame);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(canvas).toHaveAttribute('data-link-animation', 'running');
    await page.clock.runFor(200);
    expect(await canvas.screenshot()).not.toEqual(hiddenFrame);
    expect(await cameraPose(canvas)).toEqual(pose);

    await showList(page);
    await expect
      .poll(() =>
        original.evaluate((element) => ({
          connected: element.isConnected,
          animation: element.dataset.linkAnimation,
          contextLost: element.getContext('webgl2')?.isContextLost(),
        })),
      )
      .toEqual({ connected: false, animation: 'paused', contextLost: true });
  } finally {
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await original.dispose();
  }

  await showSpace(page);
  const returnedCanvas = await threeCanvas(page);
  await expect(returnedCanvas).toHaveAttribute('data-link-animation', 'running');
  await page.clock.runFor(200);
  const firstFrame = await returnedCanvas.screenshot();
  await page.clock.runFor(200);
  expect(await returnedCanvas.screenshot()).not.toEqual(firstFrame);
  const returned = await returnedCanvas.evaluateHandle((element: HTMLCanvasElement) => element);
  try {
    await page.getByRole('switch', { name: '演示' }).uncheck();
    await expect(page.getByTestId('asset-three-canvas')).toHaveCount(0);
    await expect
      .poll(() =>
        returned.evaluate((element) => ({
          connected: element.isConnected,
          animation: element.dataset.linkAnimation,
          contextLost: element.getContext('webgl2')?.isContextLost(),
        })),
      )
      .toEqual({ connected: false, animation: 'paused', contextLost: true });
  } finally {
    await returned.dispose();
  }
});

test('WebGL unavailable is a visible fallback, while floor and asset controls still work', async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  let writes = 0;
  await page.route(`${prefix}place`, (route) => {
    writes++;
    return route.abort('failed');
  });
  await demo(page);
  await showSpace(page);
  const viewport = page.locator('[data-render-state]');
  await expect(viewport).toHaveAttribute('data-render-state', 'unavailable');
  await expect(viewport.getByRole('alert')).toBeVisible();
  const remote = page.getByRole('region', { name: 'OpenMind 房屋空间示意' });
  await remote.getByRole('button', { name: '3F', exact: true }).click();
  await remote.getByRole('button', { name: /Workstation.*3F, 失联/ }).click();
  await expect(page.getByRole('dialog', { name: '资产详情' })).toBeVisible();
  expect(writes).toBe(0);
});

test('a lost WebGL context stops animation and preserves accessible device selection', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demo(page);
  await showSpace(page);
  const canvas = await threeCanvas(page);
  await expect(canvas).toHaveAttribute('data-link-animation', 'running');
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => {
      const extension = element.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext();
      return true;
    }),
  ).toBe(true);
  const viewport = page.locator('[data-render-state]');
  await expect(viewport).toHaveAttribute('data-render-state', 'lost');
  await expect(viewport.getByRole('alert')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-link-animation', 'paused');
  await expect(page.getByRole('button', { name: /连接线动画|播放连线|暂停连线/ })).toHaveCount(0);
  await showList(page);
  await page.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '资产详情' })).toBeVisible();
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
  const row = page.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true });
  await expect(row).toContainText('在线');
  await page.clock.fastForward(599_999);
  await expect(row).toContainText('在线');
  await page.clock.runFor(1);
  await expect(row).toContainText('未知');
  await expect(row).not.toContainText('在线');
  await expect(page.getByTestId('asset-three-canvas')).toHaveCount(0);
});

test('capture shareable synthetic desktop list, topology and space previews', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await demo(page);
  await expect(page.getByTestId('asset-three-canvas')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/personal-assets-list-preview.png', fullPage: true });
  const topology = await showTopology(page);
  await expect(topology.getByRole('button', { name: /^查看资产 / })).toHaveCount(9);
  await topology.getByRole('button', { name: '适配拓扑', exact: true }).click();
  await expect(
    topology.getByRole('button', { name: '查看资产 Demo · Atlas', exact: true }),
  ).toBeInViewport();
  await expect(
    topology.getByRole('button', { name: '查看资产 Demo · Unlocated', exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: 'test-results/personal-assets-topology-preview.png',
    fullPage: true,
  });
  await showSpace(page);
  await page
    .getByRole('region', { name: 'OpenMind 房屋空间示意' })
    .getByRole('button', { name: '4F', exact: true })
    .click();
  const canvas = await threeCanvas(page);
  await expect.poll(() => projectedAssetIds(canvas)).toEqual(demoPlacedIds);
  await page.screenshot({ path: 'test-results/personal-assets-preview.png', fullPage: true });
});
