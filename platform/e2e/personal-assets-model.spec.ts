import { test, expect } from '@playwright/test';
import { createDemoAssets, effectivePresence } from '../apps/personal/src/pages/asset/model';
import { cameraFitDistance, deviceSlots } from '../apps/personal/src/pages/asset/threeScene';

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
