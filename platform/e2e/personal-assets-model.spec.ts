import { test, expect } from '@playwright/test';
import { createDemoAssets, effectivePresence } from '../apps/personal/src/pages/asset/model';

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
