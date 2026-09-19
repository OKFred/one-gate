import type { Page } from '@playwright/test';
import { fulfillOk, installRecycleBinFixture } from './recycle-bin-fixture.js';

export interface UndoDepartment {
  id: number;
  name: string;
  parentId: number | null;
  isEnabled: boolean;
  updateTimeUtc: number | null;
}

export interface UndoReceipt {
  resourceType: 'department';
  id: number;
  expectedDeletedTimeUtc: number;
  undoExpiresTimeUtc: number;
  serverTimeUtc: number;
}

export interface UndoRequest {
  resourceType: string;
  id: number;
  expectedDeletedTimeUtc: number;
}

export const undoDepartment = (
  id: number,
  overrides: Partial<UndoDepartment> = {},
): UndoDepartment => ({
  id,
  name: `Undo department ${id}`,
  parentId: null,
  isEnabled: true,
  updateTimeUtc: null,
  ...overrides,
});

/** Extends the blocked-network fixture; every business request stays in this browser. */
export async function installDeleteUndoFixture(
  page: Page,
  options: {
    departments?: UndoDepartment[];
    permissions?: string[];
    serverTimeUtc?: number;
    langCode?: 'en-US' | 'zh-CN';
  } = {},
) {
  const base = await installRecycleBinFixture(page, {
    rows: [],
    permissions: options.permissions,
    langCode: options.langCode,
  });
  const state = {
    base,
    departments: options.departments ?? [undoDepartment(1)],
    deleted: new Map<number, { department: UndoDepartment; receipt: UndoReceipt }>(),
    deleteRequests: [] as { id: number; expectedUpdateTimeUtc: number | null }[],
    undoRequests: [] as UndoRequest[],
    listRequests: [] as { keyword?: string }[],
    getRequests: [] as { id: number }[],
    restore(id: number) {
      const record = state.deleted.get(id);
      if (!record) throw new Error(`No fixture deletion exists for ${id}`);
      state.departments.push({
        ...record.department,
        updateTimeUtc: record.receipt.expectedDeletedTimeUtc,
      });
      state.deleted.delete(id);
      return record;
    },
  };
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/department/deleteWithUndo')) {
      state.deleteRequests.push(request.postDataJSON());
    } else if (path.endsWith('/recycle-bin/undo')) {
      state.undoRequests.push(request.postDataJSON());
    } else if (path.endsWith('/department/listAll')) {
      state.listRequests.push(request.postDataJSON());
    } else if (path.endsWith('/department/get')) {
      state.getRequests.push(request.postDataJSON());
    }
  });
  await page.route('**/api/v1/admin/system/department/listAll', async (route) => {
    const request = route.request().postDataJSON() as { keyword?: string };
    await route.fulfill(
      fulfillOk(
        state.departments.filter((department) =>
          department.name.toLowerCase().includes(request.keyword?.toLowerCase() ?? ''),
        ),
      ),
    );
  });
  await page.route('**/api/v1/admin/system/department/get', async (route) => {
    const request = route.request().postDataJSON() as { id: number };
    await route.fulfill(
      fulfillOk(state.departments.find((department) => department.id === request.id) ?? null),
    );
  });
  await page.route('**/api/v1/admin/system/department/deleteWithUndo', async (route) => {
    const request = route.request().postDataJSON() as { id: number };
    const department = state.departments.find((item) => item.id === request.id);
    if (!department) throw new Error(`No active fixture department exists for ${request.id}`);
    const deletedTime = Math.max(
      options.serverTimeUtc ?? Date.now(),
      (department.updateTimeUtc ?? 0) + 1,
    );
    const receipt: UndoReceipt = {
      resourceType: 'department',
      id: department.id,
      expectedDeletedTimeUtc: deletedTime,
      undoExpiresTimeUtc: deletedTime + 15_000,
      serverTimeUtc: deletedTime,
    };
    state.deleted.set(department.id, { department, receipt });
    state.departments = state.departments.filter((item) => item.id !== department.id);
    await route.fulfill(fulfillOk(receipt));
  });
  await page.route('**/api/v1/admin/maintenance/recycle-bin/undo', async (route) => {
    const request = route.request().postDataJSON() as UndoRequest;
    const deleted = state.deleted.get(request.id);
    if (!deleted || request.expectedDeletedTimeUtc !== deleted.receipt.expectedDeletedTimeUtc) {
      throw new Error('Undo fixture received a stale or mismatched deletion version');
    }
    state.restore(request.id);
    await route.fulfill(fulfillOk(request.id));
  });
  return state;
}
