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

export const usageFixtureNow = Date.UTC(2026, 9, 25, 8);
export type UsageDays = 1 | 3 | 7 | 30;
const now = usageFixtureNow;
const day = Date.UTC(2026, 9, 25);
const dayMs = 86_400_000;
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
        dayUtc: day - dayMs,
        value: 4,
        kind: 'daily_usage',
        source: 'Official fixture',
      },
      {
        metricId: 'workers',
        dayUtc: day,
        value: 8,
        kind: 'daily_usage',
        source: 'Official fixture',
      },
      {
        metricId: 'workers',
        dayUtc: monthStart,
        value: 80,
        kind: 'cumulative_snapshot',
        source: 'Official fixture',
      },
      ...[40, 60, 80].map((value, index) => ({
        metricId: 'workers',
        dayUtc: day - (2 - index) * dayMs,
        value,
        kind: 'cumulative_snapshot' as const,
        source: 'quota-observation:Official usage fixture',
      })),
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

/** A UTC daily quota, including a null day and an absent day that must stay gaps. */
export function dailyUsageOverview(): UsageOverview {
  const overview = usageOverview();
  overview.metrics = [
    {
      ...overview.metrics[0],
      id: 'daily-workers',
      name: 'Daily requests',
      used: 120,
      remaining: 0,
      percentage: 120,
      periodKind: 'day',
      periodStartUtc: day,
      periodEndUtc: day + dayMs,
      resetTimeUtc: day + dayMs,
      quotaKind: 'hard',
    },
  ];
  overview.history = [
    ...[
      { offset: 6, value: 25 },
      { offset: 5, value: 30 },
      { offset: 4, value: null },
      { offset: 3, value: 45 },
      { offset: 1, value: 60 },
      { offset: 0, value: 120 },
    ].map(({ offset, value }) => ({
      metricId: 'daily-workers',
      dayUtc: day - offset * dayMs,
      value,
      kind: 'daily_usage' as const,
      source: 'Official daily fixture',
    })),
    {
      metricId: 'daily-workers',
      dayUtc: day,
      value: 999,
      kind: 'cumulative_snapshot',
      source: 'quota-observation:Official daily fixture',
    },
  ];
  return overview;
}

/** Current-cycle observations must not be added to daily usage or old API snapshots. */
export function cumulativeUsageOverview(): UsageOverview {
  const overview = usageOverview();
  overview.metrics = [{ ...overview.metrics[0], name: 'Cycle requests' }];
  overview.history.push(
    {
      metricId: 'workers',
      dayUtc: day,
      value: 999,
      kind: 'daily_usage',
      source: 'Official daily fixture',
    },
    {
      metricId: 'workers',
      dayUtc: monthStart + dayMs,
      value: 999,
      kind: 'cumulative_snapshot',
      source: 'Official old cumulative fixture',
    },
    {
      metricId: 'workers',
      dayUtc: monthStart - dayMs,
      value: 999,
      kind: 'cumulative_snapshot',
      source: 'quota-observation:Official previous-cycle fixture',
    },
  );
  return overview;
}

export function capacityUsageOverview(): UsageOverview {
  const overview = usageOverview();
  overview.metrics = [
    {
      ...overview.metrics[0],
      id: 'capacity',
      product: 'R2',
      name: 'Current storage',
      used: 6,
      unit: 'GB',
      limit: 10,
      remaining: 4,
      percentage: 60,
      periodKind: 'instant',
      periodStartUtc: null,
      periodEndUtc: null,
      resetTimeUtc: null,
      quotaKind: 'capacity',
    },
  ];
  overview.history = [
    {
      metricId: 'capacity',
      dayUtc: day - dayMs,
      value: 4,
      kind: 'daily_usage',
      source: 'Official historical fixture',
    },
    {
      metricId: 'capacity',
      dayUtc: day,
      value: 50,
      kind: 'cumulative_snapshot',
      source: 'quota-observation:Official capacity fixture',
    },
  ];
  return overview;
}

/** All business requests and remote federation modules remain inside the fixture. */
export async function installCloudflareHomeFixture(
  page: Page,
  options: {
    permissions?: string[];
    overview?: UsageOverview;
    catalog?: ChatCatalog;
    langCode?: 'en-US' | 'zh-CN';
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
    overviewRequests: [] as { days?: UsageDays }[],
    refreshRequests: 0,
    modelRequests: 0,
    oldModelRequests: 0,
  };
  await page.addInitScript((langCode: 'en-US' | 'zh-CN') => {
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: 42,
        username: 'fixture_user',
        token: 'fixture-token',
        langCode,
      }),
    );
    sessionStorage.setItem('chunk_reload_attempted', '1');
  }, options.langCode ?? 'en-US');
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (
      /\/(enterprise|personal)\/remoteEntry\.js$/u.test(url.pathname) ||
      (url.pathname === '/remoteEntry.js' &&
        ['gate-enterprise.this-time.com', 'gate-personal.this-time.com'].includes(url.hostname))
    ) {
      await route.fulfill({
        contentType: 'application/javascript',
        headers: { 'access-control-allow-origin': '*' },
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
      const request = route.request().postDataJSON() as { days?: UsageDays };
      state.overviewRequests.push(request);
      const since = day - ((request.days ?? 7) - 1) * dayMs;
      result = {
        ...state.overview,
        history: state.overview.history.filter((point) => point.dayUtc >= since),
      };
    } else if (path.endsWith('/cloudflare-usage/refresh')) {
      state.refreshRequests += 1;
      result = { accepted: true, jobId: 'fixture-job', eligibleTimeUtc: null, state: 'pending' };
    }
    await route.fulfill(fulfillOk(result));
  });
  return state;
}
