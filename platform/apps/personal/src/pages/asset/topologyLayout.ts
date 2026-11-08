import type { AssetView, Site } from './model';

export const topologyAssetSize = { width: 220, height: 96 };
export const topologyGroupSize = { width: 164, height: 56 };

type PositionedNode = { id: string; position: { x: number; y: number } };
export type TopologyNode = PositionedNode &
  (
    | { kind: 'site'; site: Site }
    | { kind: 'floor'; site: Site; floor: number }
    | { kind: 'pending' }
    | { kind: 'asset'; asset: AssetView }
  );
export type TopologyEdge = {
  id: string;
  source: string;
  target: string;
  kind: 'placement' | 'host';
};

export function buildAssetTopologyLayout(assets: AssetView[]): {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
} {
  const physical = [
    ...new Map(
      assets.filter((asset) => !asset.demoKind).map((asset) => [asset.assetId, asset]),
    ).values(),
  ].sort((a, b) => (a.assetId === b.assetId ? 0 : a.assetId < b.assetId ? -1 : 1));
  const buckets = new Map<string, AssetView[]>();
  for (const asset of physical) {
    const { site, floor } = asset.placement;
    const placed =
      (site === 'OpenLife' && floor === 1) ||
      (site === 'OpenMind' && floor !== null && [1, 2, 3, 4].includes(floor));
    const key = placed ? `${site}:${floor}` : 'pending';
    const rows = buckets.get(key) ?? [];
    rows.push(asset);
    buckets.set(key, rows);
  }
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const gap = 24;
  const cellHeight = topologyAssetSize.height + gap;
  const heightForCount = (count: number) => Math.max(1, count) * cellHeight - gap;
  const width = topologyAssetSize.width + topologyGroupSize.width + 48;
  let left = 0;
  for (const site of ['OpenLife', 'OpenMind'] as const) {
    const levels = site === 'OpenLife' ? [1] : [1, 2, 3, 4];
    const siteId = `site:${site}`;
    nodes.push({
      id: siteId,
      kind: 'site',
      site,
      position: { x: left, y: 0 },
    });
    let top = 128;
    for (const floor of levels) {
      const floorId = `floor:${site}:${floor}`;
      const residents = buckets.get(`${site}:${floor}`) ?? [];
      const height = heightForCount(residents.length);
      nodes.push({
        id: floorId,
        kind: 'floor',
        site,
        floor,
        position: { x: left, y: top + (height - topologyGroupSize.height) / 2 },
      });
      edges.push({
        id: `placement:${floorId}`,
        source: siteId,
        target: floorId,
        kind: 'placement',
      });
      residents.forEach((asset, index) => {
        const id = `asset:${asset.assetId}`;
        nodes.push({
          id,
          kind: 'asset',
          asset,
          position: {
            x: left + topologyGroupSize.width + 48,
            y: top + index * cellHeight,
          },
        });
        edges.push({ id: `placement:${id}`, source: floorId, target: id, kind: 'placement' });
      });
      top += height + 48;
    }
    left += width + 96;
  }
  const pending = buckets.get('pending') ?? [];
  if (pending.length) {
    const height = heightForCount(pending.length);
    nodes.push({
      id: 'pending',
      kind: 'pending',
      position: {
        x: left,
        y: 128 + (height - topologyGroupSize.height) / 2,
      },
    });
    pending.forEach((asset, index) => {
      const id = `asset:${asset.assetId}`;
      nodes.push({
        id,
        kind: 'asset',
        asset,
        position: {
          x: left + topologyGroupSize.width + 48,
          y: 128 + index * cellHeight,
        },
      });
      edges.push({ id: `placement:${id}`, source: 'pending', target: id, kind: 'placement' });
    });
  }
  const visible = new Set(physical.map((asset) => asset.assetId));
  for (const asset of physical) {
    if (asset.hostAssetId && asset.hostAssetId !== asset.assetId && visible.has(asset.hostAssetId))
      edges.push({
        id: `host:${asset.assetId}`,
        source: `asset:${asset.hostAssetId}`,
        target: `asset:${asset.assetId}`,
        kind: 'host',
      });
  }
  return { nodes, edges };
}
