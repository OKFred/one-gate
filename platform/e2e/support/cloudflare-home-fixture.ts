import type { Page } from '@playwright/test';
import type { paths } from '../../packages/ui/src/types/openapi';

type DataAt<Path extends keyof paths> = paths[Path] extends {
  post: { responses: { 200: { content: { 'application/json': { data: infer Data } } } } };
}
  ? Data
  : never;
export type UsageOverview = DataAt<'/api/v1/admin/maintenance/cloudflare-usage/overview'>;
export type ChatCatalog = DataAt<'/api/v1/admin/ai/chat/models'>;
export type ChatRequest = NonNullable<
  paths['/api/v1/admin/ai/chat/ask']['post']['requestBody']
>['content']['application/json'];

export const fulfillOk = (data: unknown) => ({
  contentType: 'application/json',
  body: JSON.stringify({ ok: true, data, message: 'ok' }),
});
export const fixtureCatalog: ChatCatalog = {
  defaultModelKey: 'fixture:text:r1',
  models: [
    {
      modelKey: 'fixture:text:r1',
      label: 'Fixture text',
      providerKind: 'openai_compatible',
      capabilities: ['text'],
      available: true,
      unavailableReason: null,
      isDefault: true,
    },
    {
      modelKey: 'fixture:vision:r1',
      label: 'Fixture vision',
      providerKind: 'cloudflare',
      capabilities: ['text', 'image'],
      available: true,
      unavailableReason: null,
      isDefault: false,
    },
    {
      modelKey: 'fixture:offline:r1',
      label: 'Fixture offline',
      providerKind: 'cloudflare',
      capabilities: ['text'],
      available: false,
      unavailableReason: 'Not configured',
      isDefault: false,
    },
  ],
};

const now = Date.UTC(2026, 9, 25, 8);
const monthStart = Date.UTC(2026, 9, 1);
const monthEnd = Date.UTC(2026, 10, 1);

export function usageOverview(): UsageOverview {
  const metric = {
    id: 'workers',
    product: 'Workers',
    name: 'Requests',
    unit: 'requests',
    used: 80,
    limit: 100,
    remaining: 20,
    percentage: 80,
    periodKind: 'billing_cycle' as const,
    periodStartUtc: monthStart,
    periodEndUtc: monthEnd,
    resetTimeUtc: monthEnd,
    quotaKind: 'included' as const,
    source: 'Official usage fixture',
    quality: 'exact' as const,
    status: 'available',
    reason: null,
    collectedTimeUtc: now,
  };
  const cost = {
    periodStartUtc: monthStart,
    periodEndUtc: monthEnd,
    source: 'Official cost fixture',
    status: 'official_usage_cost_billed',
  };
  return {
    account: { id: 'fixture-account', name: 'Fixture account' },
    configuration: 'configured',
    metrics: [
      metric,
      {
        ...metric,
        id: 'd1',
        product: 'D1',
        name: 'Rows',
        unit: 'rows',
        used: 100,
        remaining: 0,
        percentage: 100,
        quotaKind: 'hard',
      },
      {
        ...metric,
        id: 'r2',
        product: 'R2',
        name: 'Unknown storage',
        unit: 'GB-month',
        used: null,
        limit: null,
        remaining: null,
        percentage: null,
        quotaKind: 'unknown',
        quality: 'unknown',
        status: 'unknown',
        reason: 'Billing range is not covered',
      },
      {
        ...metric,
        id: 'ai',
        product: 'Workers AI',
        name: 'Neurons',
        unit: 'neurons',
        used: 120,
        remaining: 0,
        percentage: 120,
      },
    ],
    costs: [
      { ...cost, id: 'usd-workers', product: 'Workers', currency: 'USD', amount: '0.10' },
      { ...cost, id: 'usd-d1', product: 'D1', currency: 'USD', amount: '0.20' },
      { ...cost, id: 'eur-r2', product: 'R2', currency: 'EUR', amount: '1.25' },
      {
        ...cost,
        id: 'older-usd',
        product: 'Workers',
        currency: 'USD',
        amount: '0.90',
        periodStartUtc: Date.UTC(2026, 8, 1),
        periodEndUtc: monthStart,
      },
    ],
    history: [
      {
        metricId: 'workers',
        dayUtc: now - 86_400_000,
        value: 4,
        kind: 'daily_usage',
        source: 'Official fixture',
      },
      {
        metricId: 'workers',
        dayUtc: now,
        value: 8,
        kind: 'daily_usage',
        source: 'Official fixture',
      },
      {
        metricId: 'workers',
        dayUtc: now,
        value: 80,
        kind: 'cumulative_snapshot',
        source: 'Official fixture',
      },
    ],
    coverage: [
      { product: 'Billing', status: 'forbidden', reason: 'Billing Read permission missing' },
      { product: 'Queues', status: 'unsupported', reason: 'API does not expose this meter' },
    ],
    sync: {
      state: 'partial',
      jobId: null,
      lastSuccessTimeUtc: now,
      nextRunTimeUtc: now + 900_000,
      retryTimeUtc: null,
    },
    collectedTimeUtc: now,
  };
}

/** All business requests and remote federation modules remain inside the fixture. */
export async function installCloudflareHomeFixture(
  page: Page,
  options: {
    permissions?: string[];
    overview?: UsageOverview;
    catalog?: ChatCatalog;
  } = {},
) {
  const state = {
    permissions: options.permissions ?? [
      'admin.ai.chat:read',
      'admin.maintenance.cloudflare_usage:read',
    ],
    overview: options.overview ?? usageOverview(),
    catalog: options.catalog ?? fixtureCatalog,
    askRequests: [] as ChatRequest[],
    overviewRequests: [] as { days?: 7 | 30 }[],
    refreshRequests: 0,
    modelRequests: 0,
    oldModelRequests: 0,
  };
  await page.addInitScript(() => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: 42,
        username: 'fixture_user',
        token: 'fixture-token',
        langCode: 'en-US',
      }),
    );
    sessionStorage.setItem('chunk_reload_attempted', '1');
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (/\/(enterprise|personal)\/remoteEntry\.js$/u.test(url.pathname)) {
      await route.fulfill({
        contentType: 'application/javascript',
        body: 'export const init = () => {}; export const get = async () => () => ({ default: () => null });',
      });
      return;
    }
    if (!url.pathname.startsWith('/api/')) {
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) await route.continue();
      else await route.abort('blockedbyclient');
      return;
    }
    const path = url.pathname;
    let result: unknown = [];
    if (path.endsWith('/auth/gate/status')) result = { verified: true, expiresAtUtc: null };
    else if (path.endsWith('/auth/check')) result = true;
    else if (path.endsWith('/auth/getButtonPermission'))
      result = {
        permissions: state.permissions.map((code, index) => ({
          id: index + 1,
          code,
          isEnabled: true,
        })),
      };
    else if (path.endsWith('/menu/tree'))
      result = [
        { id: 1, name: 'sidebar.menu.home', path: '/home', children: [] },
        { id: 2, name: 'sidebar.menu.ai.chat', path: '/admin/ai/chat', children: [] },
      ];
    else if (path.endsWith('/ai/chat/models')) {
      state.modelRequests += 1;
      result = state.catalog;
    } else if (path.endsWith('/ai/openai/models')) {
      state.oldModelRequests += 1;
    } else if (path.endsWith('/ai/chat/ask')) {
      state.askRequests.push(route.request().postDataJSON() as ChatRequest);
      result = '**Fixture reply**';
    } else if (path.endsWith('/cloudflare-usage/overview')) {
      state.overviewRequests.push(route.request().postDataJSON() as { days?: 7 | 30 });
      result = state.overview;
    } else if (path.endsWith('/cloudflare-usage/refresh')) {
      state.refreshRequests += 1;
      result = { accepted: true, jobId: 'fixture-job', eligibleTimeUtc: null, state: 'pending' };
    }
    await route.fulfill(fulfillOk(result));
  });
  return state;
}
