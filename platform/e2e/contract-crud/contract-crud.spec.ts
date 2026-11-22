import { expect, test, type Page } from '@playwright/test';
import { fulfillOk, installRecycleBinFixture } from '../support/recycle-bin-fixture.js';
import { readE2EEnvironment } from '../support/test-environment.js';

const environment = readE2EEnvironment();
const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(
  new URL(environment.baseUrl).hostname,
);
test.skip(
  !environment.mockAuth || !localPreview,
  'Requires the isolated mock-auth fixture and a local preview URL.',
);
test.use({ storageState: { cookies: [], origins: [] } });

interface DeferredGate {
  promise: Promise<void>;
  release: () => void;
}

function createDeferredGate(): DeferredGate {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

interface ContractCrudFixtureOptions {
  webhookListGate?: DeferredGate;
  onWebhookListStart?: () => void;
}

function attachRuntimeErrorCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  return {
    assertClean() {
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    },
  };
}

async function installContractCrudFixture(
  page: Page,
  options: ContractCrudFixtureOptions = {},
) {
  const base = await installRecycleBinFixture(page, {
    permissions: [
      'admin.ai.config:read',
      'admin.ai.config:add',
      'admin.ai.config:edit',
      'admin.ai.config:delete',
      'admin.base.webhook_config:read',
      'admin.base.webhook_config:add',
      'admin.base.webhook_config:edit',
      'admin.base.webhook_config:delete',
      'admin.mail.log:read',
      'admin.base.log:read',
    ],
    rows: [],
  });

  const webhookRows = [
    {
      id: 201,
      source: 'feishu',
      url: 'https://hooks.example.test/feishu-1',
      isEnabled: true,
      isPrimary: true,
      remark: null as string | null,
      createTimeUtc: 1_790_000_000_000,
    },
  ];

  const state = {
    base,
    webhookRows,
    webhookAdds: [] as Record<string, unknown>[],
    logTabsRequested: [] as string[],
  };

  await page.route('**/api/v1/admin/system/menu/tree', (route) =>
    route.fulfill(
      fulfillOk([
        {
          id: 301,
          name: 'sidebar.menu.ai.config',
          path: '/admin/ai/config',
          children: [],
        },
        {
          id: 302,
          name: 'sidebar.menu.admin.base.webhookConfig',
          path: '/admin/base/webhook_config',
          children: [],
        },
        {
          id: 303,
          name: 'sidebar.menu.mail.log',
          path: '/admin/mail/log',
          children: [],
        },
        {
          id: 304,
          name: 'sidebar.menu.admin.base.log',
          path: '/admin/base/log',
          children: [],
        },
      ]),
    ),
  );

  await page.route('**/api/v1/admin/data/schema_form/batch_get', (route) =>
    route.fulfill(fulfillOk({ version: 'contract-crud-fixture-v1', schemas: {} })),
  );

  await page.route('**/api/v1/admin/ai/config/list', (route) =>
    route.fulfill(
      fulfillOk({
        list: [
          {
            id: 101,
            name: 'Fixture AI Primary',
            provider: 'OpenAI',
            model: 'gpt-4o-mini',
            baseUrl: 'https://api.example.test/v1',
            apiKey: 'sk-fixture',
            capabilities: '["text"]',
            isDefault: true,
            isEnabled: true,
            remark: null,
            createTimeUtc: 1_790_000_000_000,
          },
        ],
        total: 1,
        currentPage: 1,
        pageSize: 10,
        totalPage: 1,
      }),
    ),
  );

  await page.route('**/api/v1/admin/base/webhook_config/*', async (route) => {
    const operation = new URL(route.request().url()).pathname.split('/').at(-1);
    if (operation === 'list') {
      options.onWebhookListStart?.();
      if (options.webhookListGate) {
        await options.webhookListGate.promise;
      }
      await route.fulfill(
        fulfillOk({
          list: state.webhookRows,
          total: state.webhookRows.length,
          currentPage: 1,
          pageSize: 10,
          totalPage: 1,
        }),
      );
      return;
    }

    if (operation === 'add') {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      state.webhookAdds.push(payload);
      const id = 201 + state.webhookRows.length;
      state.webhookRows.push({
        id,
        source: String(payload.source ?? 'feishu'),
        url: String(payload.url ?? ''),
        isEnabled: Boolean(payload.isEnabled ?? true),
        isPrimary: Boolean(payload.isPrimary ?? true),
        remark: typeof payload.remark === 'string' ? payload.remark : null,
        createTimeUtc: 1_790_000_000_000,
      });
      await route.fulfill(fulfillOk({ id }));
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, message: 'Unexpected webhook_config write operation' }),
    });
  });

  await page.route('**/api/v1/admin/mail/log/list', (route) =>
    route.fulfill(
      fulfillOk({
        list: [
          {
            id: 701,
            title: 'Fixture Welcome Email',
            mailTo: 'receiver@example.test',
            mailFrom: 'sender@example.test',
            sendStatus: false,
            templateId: null,
            templateParams: null,
            exceptionCode: 'SMTP_550',
            exceptionDetails: 'Mailbox unavailable',
            createTimeUtc: 1_790_000_000_000,
            remark: 'retry-later',
            creatorId: 42,
            creatorName: 'fixture_admin',
          },
        ],
        total: 1,
        currentPage: 1,
        pageSize: 10,
        totalPage: 1,
      }),
    ),
  );

  await page.route('**/api/v1/admin/base/log/*/list', async (route) => {
    const segments = new URL(route.request().url()).pathname.split('/');
    const tab = segments.at(-2) ?? '';
    state.logTabsRequested.push(tab);

    const rowsByTab: Record<string, Record<string, unknown>[]> = {
      sys: [
        {
          id: 301,
          namespace: 'fixture.sys.ns',
          logLevel: 'INFO',
          createTimeUtc: 1_790_000_000_000,
          logValue: { ok: true },
          payloadType: 'json',
          tenantId: null,
          remark: null,
          creatorId: 42,
        },
      ],
      audit: [
        {
          id: 302,
          namespace: 'fixture.audit.ns',
          action: 'UPDATE',
          createTimeUtc: 1_790_000_000_000,
          creatorName: 'fixture_admin',
          beforeData: null,
          afterData: null,
        },
      ],
      biz: [
        {
          id: 303,
          namespace: 'fixture.biz.ns',
          status: true,
          payloadType: 'json',
          createTimeUtc: 1_790_000_000_000,
          logValue: { step: 'done' },
        },
      ],
      http: [
        {
          id: 304,
          namespace: 'fixture.http.ns',
          method: 'POST',
          url: 'https://api.example.test/ping',
          statusCode: 200,
          durationMs: 12,
          createTimeUtc: 1_790_000_000_000,
        },
      ],
    };

    const list = rowsByTab[tab] ?? [];
    await route.fulfill(
      fulfillOk({
        list,
        total: list.length,
        currentPage: 1,
        pageSize: 10,
        totalPage: 1,
      }),
    );
  });

  return state;
}

test('switching uncached pure-JSON contract routes clears previous rows immediately without stale flash', async ({
  page,
}) => {
  const errors = attachRuntimeErrorCollectors(page);
  const webhookGate = createDeferredGate();
  let webhookListStarted = false;

  const fixture = await installContractCrudFixture(page, {
    webhookListGate: webhookGate,
    onWebhookListStart: () => {
      webhookListStarted = true;
    },
  });

  await page.goto('/#/admin/ai/config');
  await expect(page.getByText('Fixture AI Primary', { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const win = window as unknown as { __contractCrudSameDoc?: boolean };
    win.__contractCrudSameDoc = true;
    window.location.hash = '#/admin/base/webhook_config';
  });

  await expect.poll(() => webhookListStarted).toBe(true);
  await expect(page.getByText('Fixture AI Primary', { exact: true })).toHaveCount(0);

  webhookGate.release();
  await expect(page.getByText('https://hooks.example.test/feishu-1', { exact: true })).toBeVisible();
  await expect(page.getByText('feishu', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture AI Primary', { exact: true })).toHaveCount(0);

  const sameDoc = await page.evaluate(
    () => (window as unknown as { __contractCrudSameDoc?: boolean }).__contractCrudSameDoc === true,
  );
  expect(sameDoc).toBe(true);
  expect(fixture.base.unexpectedRequests).toEqual([]);
  errors.assertClean();
});

test('webhook contract form enforces password autofill guard, regex pattern, and client-side uri validation', async ({
  page,
}) => {
  const errors = attachRuntimeErrorCollectors(page);
  const fixture = await installContractCrudFixture(page);

  await page.goto('/#/admin/base/webhook_config');
  await expect(page.getByText('https://hooks.example.test/feishu-1', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const urlInput = dialog.locator('input[name="url"]');
  const sourceInput = dialog.locator('input[name="source"]');

  await expect(urlInput).toHaveAttribute('type', 'password');
  await expect(urlInput).toHaveAttribute('autocomplete', 'new-password');
  await expect(sourceInput).toHaveAttribute('pattern', '^[A-Za-z][A-Za-z0-9_\\-]*$');

  const toggleButton = dialog.getByRole('button', {
    name: 'toggle password visibility',
    exact: true,
  });
  await toggleButton.click();
  await expect(urlInput).toHaveAttribute('type', 'text');
  await toggleButton.click();
  await expect(urlInput).toHaveAttribute('type', 'password');

  await urlInput.fill('not-a-valid-url');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(dialog).toBeVisible();
  await expect(urlInput).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.locator('.MuiFormHelperText-root.Mui-error')).toBeVisible();
  expect(fixture.webhookAdds).toHaveLength(0);

  await urlInput.fill('https://hooks.example.test/new-bot');
  await expect(urlInput).toHaveAttribute('aria-invalid', 'false');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(dialog).toHaveCount(0);
  expect(fixture.webhookAdds).toEqual([
    {
      source: 'feishu',
      url: 'https://hooks.example.test/new-bot',
      isEnabled: true,
      isPrimary: true,
      remark: null,
    },
  ]);
  await expect(page.getByText('https://hooks.example.test/new-bot', { exact: true })).toBeVisible();
  expect(fixture.base.unexpectedRequests).toEqual([]);
  errors.assertClean();
});

test('readonly mail log contract hides mutation buttons and renders ContractDetailDialog', async ({
  page,
}) => {
  const errors = attachRuntimeErrorCollectors(page);
  const fixture = await installContractCrudFixture(page);

  await page.goto('/#/admin/mail/log');
  await expect(page.getByText('Fixture Welcome Email', { exact: true })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);

  const row = page.getByRole('row').filter({ hasText: 'Fixture Welcome Email' });
  await row.getByRole('button').click();

  const detailDialog = page.getByRole('dialog');
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog).toContainText('Fixture Welcome Email');
  await expect(detailDialog).toContainText('receiver@example.test');
  await expect(detailDialog).toContainText('sender@example.test');
  await expect(detailDialog).toContainText('SMTP_550');
  await expect(detailDialog).toContainText('Mailbox unavailable');

  await detailDialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(detailDialog).toHaveCount(0);

  expect(fixture.base.unexpectedRequests).toEqual([]);
  errors.assertClean();
});

test('embedded base log multi-tab page queries each sub-contract endpoint without stale state', async ({
  page,
}) => {
  const errors = attachRuntimeErrorCollectors(page);
  const fixture = await installContractCrudFixture(page);

  await page.goto('/#/admin/base/log');
  await expect(page.getByText('fixture.sys.ns', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Audit Log', exact: true }).click();
  await expect(page.getByText('fixture.audit.ns', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Business Log', exact: true }).click();
  await expect(page.getByText('fixture.biz.ns', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'HTTP Request Log', exact: true }).click();
  await expect(page.getByText('https://api.example.test/ping', { exact: true })).toBeVisible();

  expect(fixture.logTabsRequested).toEqual(['sys', 'audit', 'biz', 'http']);
  expect(fixture.base.unexpectedRequests).toEqual([]);
  errors.assertClean();
});
