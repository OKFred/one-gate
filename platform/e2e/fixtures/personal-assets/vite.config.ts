import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(root, '../../../packages/ui');
const fixtureAssets = [
  { assetId: '00000000-0000-4000-8000-000000000001', name: '预览主机', category: 'host' },
  { assetId: '00000000-0000-4000-8000-000000000002', name: '预览硬盘', category: 'disk' },
  { assetId: '00000000-0000-4000-8000-000000000003', name: '预览传感器', category: 'sensor' },
];
type Placement = {
  site: string | null;
  floor: number | null;
  version: number;
  updateTimeUtc: number;
};
const placements = new Map<string, Placement>();

export default defineConfig({
  root,
  plugins: [
    react(),
    {
      name: 'isolated-personal-assets-fixture',
      configureServer(server) {
        server.middlewares.use('/api/', async (req, res) => {
          res.setHeader('content-type', 'application/json');
          res.setHeader('cache-control', 'no-store');
          const reply = (data: unknown) =>
            res.end(JSON.stringify({ ok: true, data, message: 'ok' }));
          let body = '';
          for await (const chunk of req) {
            body += String(chunk);
            if (body.length > 8192) {
              res.statusCode = 413;
              res.end();
              return;
            }
          }
          let input: unknown;
          try {
            input = JSON.parse(body || '{}');
          } catch {
            res.statusCode = 400;
            res.end();
            return;
          }
          const endpoint = req.url?.split('?')[0];
          if (endpoint === '/v1/enterprise/tenant/list') {
            reply({
              list: [
                {
                  id: 1,
                  key: 'synthetic',
                  name: '合成预览企业',
                  isEnabled: true,
                  frozen: false,
                  memberRole: 'owner',
                  creatorId: 42,
                  updaterId: null,
                  createTimeUtc: 1,
                  updateTimeUtc: null,
                },
              ],
              total: 1,
              currentPage: 1,
              pageSize: 1000,
              totalPage: 1,
            });
          } else if (endpoint === '/v1/personal/asset/overview') {
            reply({
              asOfUtc: Date.now(),
              presenceSource: 'unconfigured',
              assets: fixtureAssets.map((asset) => ({
                ...asset,
                inventoryStatus: 'active',
                hostAssetId: asset.category === 'disk' ? fixtureAssets[0].assetId : null,
                placement: placements.get(asset.assetId) ?? {
                  site: null,
                  floor: null,
                  version: null,
                  updateTimeUtc: null,
                },
                presence: {
                  status: 'unknown',
                  basis: 'not_connected',
                  lastHeartbeatTimeUtc: null,
                  observedTimeUtc: null,
                  expiresTimeUtc: null,
                },
              })),
            });
          } else if (
            endpoint === '/v1/personal/asset/place' &&
            typeof input === 'object' &&
            input !== null &&
            'assetId' in input &&
            typeof input.assetId === 'string' &&
            fixtureAssets.some((asset) => asset.assetId === input.assetId) &&
            'site' in input &&
            'floor' in input &&
            'expectedVersion' in input &&
            ((input.site === null && input.floor === null) ||
              (input.site === 'OpenLife' && input.floor === 1) ||
              (input.site === 'OpenMind' &&
                typeof input.floor === 'number' &&
                [1, 2, 3, 4].includes(input.floor)))
          ) {
            const old = placements.get(input.assetId);
            if ((old?.version ?? null) !== input.expectedVersion) {
              res.statusCode = 409;
              res.end(
                JSON.stringify({
                  ok: false,
                  data: { code: 'PERSONAL_ASSET_STATE_CONFLICT' },
                  message: '合成位置冲突',
                }),
              );
              return;
            }
            const next = {
              site: input.site,
              floor: input.floor,
              version: (old?.version ?? 0) + 1,
              updateTimeUtc: Date.now(),
            };
            placements.set(input.assetId, next);
            reply(next);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, message: 'Unknown isolated fixture endpoint' }));
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.join(uiRoot, 'src'),
      react: path.join(uiRoot, 'node_modules/react'),
      'react-dom': path.join(uiRoot, 'node_modules/react-dom'),
      'react-router-dom': path.join(uiRoot, 'node_modules/react-router-dom'),
      '@mui/material': path.join(uiRoot, 'node_modules/@mui/material'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: { host: '127.0.0.1', port: 4185, strictPort: true },
});
