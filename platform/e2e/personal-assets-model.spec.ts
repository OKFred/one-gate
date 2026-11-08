import { test, expect } from '@playwright/test';
import { createDemoAssets, effectivePresence } from '../apps/personal/src/pages/asset/model';
import { cameraFitDistance, deviceSlots } from '../apps/personal/src/pages/asset/threeScene';
import { buildAssetTopologyLayout } from '../apps/personal/src/pages/asset/topologyLayout';

test('evidence expiration is half open and never invents loss or a new lease', () => {
  const now = 1_800_000_000_000;
  const asset = createDemoAssets(now)[0];
  asset.presence.expiresTimeUtc = now + 15_000;
  expect(effectivePresence(asset, now + 14_999).status).toBe('online');
  expect(effectivePresence(asset, now + 15_000)).toMatchObject({
    status: 'unknown',
    basis: 'expired',
  });
  expect(asset.presence.status).toBe('online');
  expect(asset.presence.expiresTimeUtc).toBe(now + 15_000);
  asset.presence.status = 'offline';
  expect(effectivePresence(asset, now + 15_000).status).toBe('unknown');
  asset.presence.status = 'lost';
  asset.presence.expiresTimeUtc = null;
  expect(effectivePresence(asset, now).status).toBe('unknown');
});

test('synthetic virtual resources are explicit children and do not duplicate house devices', () => {
  const assets = createDemoAssets(1_800_000_000_000);
  const children = assets.filter((asset) => asset.demoKind);
  expect(children).toHaveLength(2);
  expect(new Set(assets.map((asset) => asset.assetId)).size).toBe(assets.length);
  expect(
    children.every(
      (child) => child.hostAssetId === assets[0].assetId && child.placement.site === null,
    ),
  ).toBe(true);
  expect(assets.filter((asset) => !asset.demoKind && asset.placement.site === null)).toHaveLength(
    1,
  );
});

test('camera fit leaves the complete bounding sphere inside portrait and landscape frustums', () => {
  for (const radius of [0.01, 1, 13, 40]) {
    for (const aspect of [0.5, 0.83, 1, 2.4]) {
      for (const verticalFov of [30, 45, 75]) {
        const distance = cameraFitDistance(radius, aspect, verticalFov);
        expect(Number.isFinite(distance)).toBe(true);
        expect(distance).toBeGreaterThan(radius);
        const angularRadius = Math.asin(radius / distance);
        const verticalHalfFov = (verticalFov * Math.PI) / 360;
        const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
        expect(angularRadius).toBeLessThan(verticalHalfFov);
        expect(angularRadius).toBeLessThan(horizontalHalfFov);
        const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
        expect((limitingHalfFov - angularRadius) / limitingHalfFov).toBeGreaterThan(0.01);
      }
    }
  }
});

test('floor slots retain every device and its outline within the usable ground at the asset limit', () => {
  for (const count of [0, 1, 32, 1000]) {
    const slots = deviceSlots(count);
    expect(slots).toHaveLength(count);
    expect(new Set(slots.map(({ x, z }) => `${x},${z}`)).size).toBe(count);
    for (const slot of slots) {
      expect([slot.x, slot.z, slot.scale].every(Number.isFinite)).toBe(true);
      expect(slot.scale).toBeGreaterThan(0);
      // Include the selected-device outline, which is larger than its solid body.
      expect(Math.abs(slot.x) + slot.scale * 0.6).toBeLessThan(6.6 / 2);
      expect(Math.abs(slot.z) + slot.scale * 0.5).toBeLessThan(4.6 / 2);
    }
  }
});

test('topology preserves canonical physical identities and only links valid visible hosts', () => {
  const assets = createDemoAssets(1_800_000_000_000);
  assets[1].hostAssetId = assets[0].assetId;
  assets[2].hostAssetId = assets[2].assetId;
  assets[3].hostAssetId = '00000000-0000-4000-8000-000000000099';
  assets[4].hostAssetId = assets[7].assetId;
  const input = [...assets, { ...assets[0] }];
  const layout = buildAssetTopologyLayout(input);
  const physical = layout.nodes.filter((node) => node.kind === 'asset');
  expect(physical.map((node) => node.asset.assetId).sort()).toEqual(
    assets
      .filter((asset) => !asset.demoKind)
      .map((asset) => asset.assetId)
      .sort(),
  );
  expect(physical).toHaveLength(9);
  const nodes = new Map(layout.nodes.map((node) => [node.id, node]));
  expect(nodes.size).toBe(layout.nodes.length);
  for (const edge of layout.edges) {
    expect(nodes.has(edge.source) && nodes.has(edge.target)).toBe(true);
    expect(edge.source).not.toBe(edge.target);
  }
  const hostPairs = layout.edges
    .filter((edge) => edge.kind === 'host')
    .map((edge) => [edge.source, edge.target].sort().join('|'))
    .sort();
  expect(hostPairs).toEqual(
    [
      [assets[0].assetId, assets[1].assetId]
        .map((id) => `asset:${id}`)
        .sort()
        .join('|'),
      [assets[4].assetId, assets[7].assetId]
        .map((id) => `asset:${id}`)
        .sort()
        .join('|'),
    ].sort(),
  );
  for (const node of physical) {
    const placements = layout.edges.filter(
      (edge) => edge.kind === 'placement' && edge.target === node.id,
    );
    expect(placements).toHaveLength(1);
    const parent = nodes.get(placements[0].source);
    if (node.asset.placement.site === null) expect(parent?.kind).toBe('pending');
    else {
      expect(parent).toMatchObject({
        kind: 'floor',
        site: node.asset.placement.site,
        floor: node.asset.placement.floor,
      });
    }
  }
  expect(buildAssetTopologyLayout([...input].reverse())).toEqual(layout);
});
