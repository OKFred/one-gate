import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import ddl from "@hodor/core/db/sql/personal/personal_medical_records.sql?raw";
import type { Context, UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
  toHttpException,
} from "@hodor/core/middleware/errorHandler/businessError";
import createHealthApp from "./index";
import service from "./service";
import { healthRepository } from "./repository";
import { medicalRecordsTable } from "./model";

const state = vi.hoisted(() => ({ actor: undefined as UserObj | undefined }));
vi.mock("@hodor/core/middleware/auth", () => ({
  authMiddleware: async (context: Context) => {
    if (!state.actor)
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    context.set("userObj", state.actor);
  },
}));
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));

function actor(userId = 17, superAdmin = false): UserObj {
  return {
    principal: { kind: "user", userId },
    // Legacy fields deliberately disagree with the authenticated principal.
    id: 998,
    userId: 999,
    username: "synthetic-health-owner",
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-fixture-only",
    isSuperAdmin: superAdmin,
    roleIds: [],
    dataScope: "all",
    customDeptIds: [],
    permissions: ["read", "add", "edit", "delete"].map((action, index) => ({
      id: index + 1,
      code: `personal.health:${action}`,
      name: "Synthetic health permission",
      category: "action",
      resource: null,
      business: null,
      remark: null,
      isEnabled: true,
      creatorId: userId,
      updaterId: null,
      createTimeUtc: 0,
      updateTimeUtc: null,
    })),
    ensureLoaded: async () => undefined,
  };
}

function input() {
  return {
    category: "exam" as const,
    title: "Synthetic examination record",
    hospitalName: "Synthetic institution",
    doctorName: "Synthetic clinician",
    visitDateUtc: 1790000000000,
    diagnosis: "Synthetic note, not medical advice",
    prescription: "Synthetic attachment description",
    reportUrl: "https://example.test/synthetic-report",
    cost: 12.5,
    remark: "Synthetic fixture only",
  };
}

function request(action: string, body: object) {
  const app = createHealthApp();
  app.onError((error, context) => {
    const http =
      error instanceof BusinessError ? toHttpException(error) : error;
    if (!(http instanceof HTTPException)) throw error;
    return context.json(
      {
        ok: false,
        message: http.message,
        data: { code: error instanceof BusinessError ? error.code : null },
      },
      http.status
    );
  });
  return app.request(`/medical_record/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("health records authenticated owner contract (SQLite and D1)", () => {
  beforeAll(() => setupTestDb(db, [ddl]));
  beforeEach(async () => {
    await clearTestData(db, ["personal_medical_records"]);
    state.actor = actor();
  });

  it("uses only the human principal for creation and never leaks another owner's list", async () => {
    const own = await service.add.service(input(), actor(17));
    await service.add.service(
      { ...input(), title: "Other synthetic record" },
      actor(18)
    );
    const response = await request("list", {});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { total: 1, list: [{ id: own.id, creatorId: 17 }] },
    });
    expect(await healthRepository.findById(998, own.id)).toBeNull();
    expect(await healthRepository.findById(18, own.id)).toBeNull();
  });

  it("permits the owner's existing business-field add, edit and delete contracts", async () => {
    expect((await request("add", input())).status).toBe(200);
    const { list } = await healthRepository.findPage({ creatorId: 17 });
    expect(list).toHaveLength(1);
    const id = list[0].id;
    const edited = await request("update", {
      id,
      title: "Edited synthetic record",
      cost: 0,
    });
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({
      ok: true,
      data: { success: true },
    });
    expect(await healthRepository.findById(17, id)).toMatchObject({
      title: "Edited synthetic record",
      cost: 0,
      creatorId: 17,
      updaterId: 17,
      reportUrl: input().reportUrl,
      visitDateUtc: input().visitDateUtc,
    });
    const deleted = await request("delete", { id });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toMatchObject({
      ok: true,
      data: { success: true },
    });
    expect(await healthRepository.findById(17, id)).toBeNull();
  });

  it("makes guessed foreign IDs indistinguishable from missing IDs, including for superadmins", async () => {
    const foreign = await service.add.service(input(), actor(18));
    state.actor = actor(17, true);
    for (const action of ["update", "delete"]) {
      const foreignResponse = await request(action, {
        id: foreign.id,
        ...(action === "update" ? { title: "Must not apply" } : {}),
      });
      const missingResponse = await request(action, {
        id: foreign.id + 10000,
        ...(action === "update" ? { title: "Must not apply" } : {}),
      });
      expect(foreignResponse.status).toBe(404);
      expect(missingResponse.status).toBe(404);
      expect(await foreignResponse.json()).toEqual(
        await missingResponse.json()
      );
    }
    expect(await healthRepository.findById(18, foreign.id)).toMatchObject({
      title: input().title,
    });
  });

  it("enforces ownership in the final update/delete SQL after a previously owned row changes owner", async () => {
    const created = await service.add.service(input(), actor(17));
    expect(await healthRepository.findById(17, created.id)).not.toBeNull();
    await db
      .update(medicalRecordsTable)
      .set({ creatorId: 18 })
      .where(eq(medicalRecordsTable.id, created.id));
    expect(
      await healthRepository.update(17, created.id, {
        title: "Stale owner update",
        updaterId: 17,
        updaterName: "Synthetic owner",
      })
    ).toBeNull();
    expect(await healthRepository.delete(17, created.id)).toBeNull();
    expect(await healthRepository.findById(18, created.id)).toMatchObject({
      title: input().title,
    });
  });

  it("rejects unauthenticated callers on every action", async () => {
    state.actor = undefined;
    for (const [action, body] of [
      ["list", {}],
      ["add", input()],
      ["update", { id: 1 }],
      ["delete", { id: 1 }],
    ] as const)
      expect((await request(action, body)).status).toBe(401);
  });

  it("rejects API tokens even when legacy fields and RBAC claim a privileged human owner", async () => {
    state.actor = {
      ...actor(17, true),
      principal: { kind: "api_token", tokenId: 17 },
    };
    for (const [action, body] of [
      ["list", {}],
      ["add", input()],
      ["update", { id: 1 }],
      ["delete", { id: 1 }],
    ] as const)
      expect((await request(action, body)).status).toBe(403);
  });

  it("fails closed for invalid/missing human principals without legacy ID fallback", async () => {
    for (const userId of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      state.actor = actor(userId, true);
      for (const [action, body] of [
        ["list", {}],
        ["add", input()],
        ["update", { id: 1 }],
        ["delete", { id: 1 }],
      ] as const)
        expect((await request(action, body)).status).toBe(403);
    }
    state.actor = actor(17, true);
    Reflect.deleteProperty(state.actor, "principal");
    expect((await request("list", {})).status).toBe(403);
  });

  it("requires a valid owner even when the repository is called directly", async () => {
    for (const owner of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      for (const operation of [
        () => healthRepository.findPage({ creatorId: owner }),
        () => healthRepository.findById(owner, 1),
        () =>
          healthRepository.insert({
            ...input(),
            creatorId: owner,
            creatorName: null,
            updaterId: owner,
            updaterName: null,
          }),
        () =>
          healthRepository.update(owner, 1, {
            title: "No-op",
            updaterId: owner,
            updaterName: null,
          }),
        () => healthRepository.delete(owner, 1),
      ])
        await expect(operation()).rejects.toMatchObject({
          code: BusinessErrorCode.PERMISSION_DENIED,
        });
    }
  });

  it("preserves RBAC as a separate requirement from record ownership", async () => {
    state.actor = { ...actor(), permissions: [] };
    expect((await request("list", {})).status).toBe(403);
    expect((await request("add", input())).status).toBe(403);
    expect(
      (await request("update", { id: 1, title: "Synthetic blocked edit" }))
        .status
    ).toBe(403);
    expect((await request("delete", { id: 1 })).status).toBe(403);
  });

  it("rejects client audit/owner fields and assigns actor metadata only on the server", async () => {
    for (const key of [
      "creatorId",
      "creatorName",
      "updaterId",
      "updaterName",
      "createTimeUtc",
      "updateTimeUtc",
    ]) {
      expect((await request("add", { ...input(), [key]: 18 })).status).toBe(
        422
      );
      expect((await request("update", { id: 1, [key]: 18 })).status).toBe(422);
    }
    const created = await service.add.service(
      Object.assign(input(), { creatorId: 18, updaterId: 18 }),
      actor(17)
    );
    await service.update.service(
      Object.assign(
        { id: created.id, title: "Synthetic edited title" },
        { creatorId: 18, updaterId: 18, updaterName: "Untrusted value" }
      ),
      actor(17)
    );
    expect(await healthRepository.findById(17, created.id)).toMatchObject({
      creatorId: 17,
      updaterId: 17,
      creatorName: actor().username,
      updaterName: actor().username,
    });
  });
});
