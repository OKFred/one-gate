import type { Page } from '@playwright/test';
import type { components, paths } from '../../packages/ui/src/types/openapi';
import { fulfillOk, installCloudflareHomeFixture } from './cloudflare-home-fixture';

type DeviceTaskState = components['schemas']['admin.mobile.async_task.state.res']['data'];
type Snapshot = NonNullable<DeviceTaskState['snapshot']>;
type Item = NonNullable<Snapshot['running']>;
type Device = components['schemas']['admin.mobile.device.get.res']['data'];
type CancelRequest = NonNullable<
  paths['/api/v1/admin/mobile/async-task/cancel']['post']['requestBody']
>['content']['application/json'];

export const runtimePermissions = [
  'admin.mobile.device:read',
  'admin.mobile.async_task:read',
  'admin.mobile.async_task:dispatch',
];

export function runtimeState(clientId = 'fixture-device-one'): DeviceTaskState {
  const now = Date.now();
  const item = (taskId: string, priority: Item['priority'], position: number): Item => ({
    taskId,
    scriptId: 'device.network.switch',
    priority,
    createdAt: now - 4000 + position,
    startedAt: null,
    position,
    phase: 'QUEUED',
    cancellable: true,
  });
  return {
    clientId,
    serverTimeUtc: now,
    receivedTimeUtc: now,
    stale: false,
    cancellableTaskIds: [
      'task-running-01',
      'task-queued-high',
      'task-queued-normal',
      'task-queued-low',
    ],
    snapshot: {
      protocolVersion: 2,
      deviceId: clientId,
      timestamp: now,
      sessionId: 'fixture-process-session',
      sessionStartedAt: now - 30_000,
      revision: 1,
      running: {
        ...item('task-running-01', 'NORMAL', 1),
        phase: 'RUNNING',
        startedAt: now - 5000,
        createdAt: now - 10_000,
        position: null,
      },
      queued: [
        item('task-queued-high', 'HIGH', 1),
        item('task-queued-normal', 'NORMAL', 2),
        item('task-queued-low', 'LOW', 3),
        item('task-external-01', 'LOW', 4),
      ],
    },
  };
}

function device(id: number, clientId: string): Device {
  return {
    id,
    clientId,
    deviceName: clientId,
    isEnabled: true,
    remark: null,
    reportedStatus: 'ONLINE',
    isOnline: true,
    lastHeartbeatTimeUtc: Date.now(),
    lastOnlineTimeUtc: null,
    lastOfflineTimeUtc: null,
    manufacturer: null,
    brand: null,
    model: 'Synthetic device',
    androidVersion: '14',
    androidSdk: 34,
    autojs6Version: null,
    clientVersion: 'fixture',
    protocolVersion: 2,
    batteryLevel: 70,
    isCharging: false,
    networkConnected: true,
    networkType: 'wifi',
    imeiStatus: null,
    imeiMasked: [],
    serialStatus: null,
    serialMasked: null,
    capabilities: {},
    reportedExtra: {},
    customMetadata: {},
    creatorId: 42,
    createTimeUtc: Date.now(),
    updaterId: null,
    updateTimeUtc: null,
  };
}

/** All device state and cancellation writes remain inside the blocked-network fixture. */
export async function installMobileTaskRuntimeFixture(
  page: Page,
  options: { permissions?: string[]; langCode?: 'en-US' | 'zh-CN' } = {},
) {
  const auth = await installCloudflareHomeFixture(page, {
    permissions: options.permissions ?? runtimePermissions,
    langCode: options.langCode,
  });
  const devices = [device(1, 'fixture-device-one'), device(2, 'fixture-device-two')];
  const state = {
    auth,
    devices,
    runtime: {
      'fixture-device-one': runtimeState(),
      'fixture-device-two': runtimeState('fixture-device-two'),
    } as Record<string, DeviceTaskState>,
    reads: [] as string[],
    cancelRequests: [] as CancelRequest[],
    failure: false,
    failReadAfterCancel: false,
    cancelMode: 'accepted' as 'accepted' | 'unknown' | 'business' | 'business200',
    beforeRead: null as ((clientId: string, sequence: number) => Promise<void>) | null,
    beforeCancel: null as (() => Promise<void>) | null,
  };
  await page.route('**/api/v1/admin/system/menu/tree', (route) =>
    route.fulfill(
      fulfillOk([
        {
          id: 501,
          name: 'sidebar.menu.admin.mobile.device',
          path: '/admin/mobile/device',
          children: [],
        },
      ]),
    ),
  );
  await page.route('**/api/v1/admin/data/schema_form/batch_get', (route) =>
    route.fulfill(fulfillOk({ version: 'mobile-task-fixture', schemas: {} })),
  );
  await page.route('**/api/v1/admin/mobile/device/list', (route) =>
    route.fulfill(
      fulfillOk({
        list: devices,
        total: devices.length,
        totalPage: 1,
        currentPage: 1,
        pageSize: 10,
      }),
    ),
  );
  await page.route('**/api/v1/admin/mobile/device/get', (route) => {
    const request: unknown = route.request().postDataJSON();
    const id =
      typeof request === 'object' && request !== null && 'id' in request ? request.id : null;
    return route.fulfill(fulfillOk(devices.find((item) => item.id === id) ?? devices[0]));
  });
  await page.route('**/api/v1/admin/mobile/async-task/state', async (route) => {
    const request: unknown = route.request().postDataJSON();
    if (
      typeof request !== 'object' ||
      request === null ||
      !('clientId' in request) ||
      typeof request.clientId !== 'string'
    )
      throw new Error('Invalid fixture state request');
    const clientId = request.clientId;
    state.reads.push(clientId);
    const result = structuredClone(state.runtime[clientId]);
    if (!result) throw new Error('Unknown synthetic device');
    result.serverTimeUtc = Date.now();
    if (state.beforeRead) await state.beforeRead(clientId, state.reads.length);
    if (state.failure || (state.failReadAfterCancel && state.cancelRequests.length)) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, message: 'Fixture read unavailable' }),
      });
      return;
    }
    await route.fulfill(fulfillOk(result));
  });
  await page.route('**/api/v1/admin/mobile/async-task/cancel', async (route) => {
    state.cancelRequests.push(route.request().postDataJSON() as CancelRequest);
    if (state.beforeCancel) await state.beforeCancel();
    if (state.cancelMode === 'unknown') return route.abort('failed');
    if (state.cancelMode === 'business' || state.cancelMode === 'business200')
      return route.fulfill({
        status: state.cancelMode === 'business' ? 409 : 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          message: 'Fixture cancellation rejected',
          data: { code: 'MOBILE_TASK_NOT_CANCELLABLE' },
        }),
      });
    const request = state.cancelRequests.at(-1);
    if (!request) throw new Error('Missing fixture cancellation request');
    return route.fulfill(
      fulfillOk({
        taskId: request.taskId,
        commandId: 'fixture-cancel-command',
        status: 'CANCEL_REQUESTED',
      }),
    );
  });
  return state;
}
