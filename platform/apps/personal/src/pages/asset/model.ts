import type { PersonalAsset } from '@/api/personal/asset';

export const sites = ['OpenLife', 'OpenMind'] as const;
export const presenceStatuses = ['online', 'offline', 'lost', 'unknown'] as const;
export type Site = (typeof sites)[number];
export type PresenceStatus = (typeof presenceStatuses)[number];
export const statusColors = {
  online: 'success',
  offline: 'error',
  lost: 'warning',
  unknown: 'default',
} as const satisfies Record<PresenceStatus, 'success' | 'error' | 'warning' | 'default'>;
export type AssetView = Omit<PersonalAsset, 'presence'> & {
  presence: {
    status: PresenceStatus;
    basis: string;
    lastHeartbeatTimeUtc: number | null;
    observedTimeUtc: number | null;
    expiresTimeUtc: number | null;
  };
  demoKind?: 'vm' | 'container';
};

export function effectivePresence(asset: AssetView, now: number) {
  const evidence = asset.presence;
  if (
    evidence.status !== 'unknown' &&
    (evidence.expiresTimeUtc === null || now >= evidence.expiresTimeUtc)
  ) {
    return { ...evidence, status: 'unknown' as const, basis: 'expired' };
  }
  return evidence;
}

export function createDemoAssets(now: number): AssetView[] {
  const specs = [
    ['1', 'Demo · Atlas', 'host', 'OpenLife', 1, 'online'],
    ['2', 'Demo · Archive', 'disk', 'OpenLife', 1, 'offline'],
    ['3', 'Demo · Climate', 'sensor', 'OpenLife', 1, 'lost'],
    ['4', 'Demo · Relay', 'host', 'OpenMind', 1, 'online'],
    ['5', 'Demo · Compute', 'host', 'OpenMind', 2, 'offline'],
    [
      '6',
      'Demo · Workstation with a deliberately long display name',
      'host',
      'OpenMind',
      3,
      'lost',
    ],
    ['7', 'Demo · Vault', 'host', 'OpenMind', 4, 'unknown'],
    ['8', 'Demo · Unlocated', 'board', null, null, 'unknown'],
    ['9', 'Demo · Expired observation', 'meter', 'OpenMind', 4, 'online'],
    ['a', 'Demo · Virtual machine', 'other', null, null, 'unknown'],
    ['b', 'Demo · Container', 'other', null, null, 'unknown'],
  ] as const;
  return specs.map(([suffix, name, category, site, floor, status]) => ({
    assetId: `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`,
    name,
    category,
    inventoryStatus: suffix === '2' ? 'retired' : 'active',
    placement: { site, floor, version: 1, updateTimeUtc: now - 60_000 },
    presence: {
      status,
      basis: 'demo',
      lastHeartbeatTimeUtc: status === 'unknown' ? null : now - 45_000,
      observedTimeUtc: status === 'unknown' ? null : now - 15_000,
      expiresTimeUtc: suffix === '9' ? now - 1 : now + 600_000,
    },
    hostAssetId: suffix === 'a' || suffix === 'b' ? '00000000-0000-4000-8000-000000000001' : null,
    ...(suffix === 'a' ? { demoKind: 'vm' as const } : {}),
    ...(suffix === 'b' ? { demoKind: 'container' as const } : {}),
  }));
}
