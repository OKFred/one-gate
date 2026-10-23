import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import db from "@hodor/core/db/index.js";
import { setupTestDb } from "@hodor/core/db/testHelper.js";
import deviceSql from "@hodor/core/db/sql/admin/admin_mobile_device.sql?raw";
import errorHandler from "@hodor/core/middleware/errorHandler/index.js";
import type { AppBindings } from "@hodor/core/types/app.js";
import { setEnv } from "@hodor/core/utils/env.js";
import createDeviceApp from "@hodor/admin/mobile/device/index.js";
import { DEVICE_REPORTED_OPERATIONS } from "@hodor/admin/mobile/device/domain/device.js";
import { hashDeviceToken } from "@hodor/admin/mobile/device/infrastructure/crypto.js";
import { mobileDeviceTable } from "@hodor/admin/mobile/device/model.js";

// Translation storage is unrelated to report authentication and persistence.
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));

const clientId = "report-contract-device";
const token = "local-report-contract-token";
const app = new OpenAPIHono<AppBindings>();

function report(operations: readonly unknown[] = DEVICE_REPORTED_OPERATIONS) {
  return {
    protocolVersion: 2,
    deviceId: clientId,
    timestamp: Date.now(),
    manufacturer: "Test",
    brand: "test",
    model: "contract-model",
    androidVersion: "14",
    androidSdk: 34,
    autojs6Version: "6.6.4",
    clientVersion: "2.1.24",
    identifiers: {
      imeis: [],
      imeiStatus: "unavailable",
      serialNumber: null,
      serialStatus: "unavailable",
    },
    capabilities: {
      root: false,
      trustedScripts: [],
      ops: {
        protocolVersion: 1,
        enabled: true,
        arbitraryShell: false,
        operations,
      },
    },
    reportedExtra: {},
  };
}

function send(operations?: readonly unknown[], reportToken = token) {
  return app.request(
    "http://device.test/api/v1/admin/mobile/device/report/info",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-device-token": reportToken,
      },
      body: JSON.stringify(report(operations)),
    }
  );
}

async function savedDevice() {
  const [device] = await db
    .select()
    .from(mobileDeviceTable)
    .where(eq(mobileDeviceTable.clientId, clientId));
  return device;
}

describe("Device Info capability report HTTP contract", () => {
  beforeAll(async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "test", LOCALE: "en-US" });
    await setupTestDb(db, [deviceSql]);
    errorHandler(app);
    app.route("/api/v1/admin/mobile/device", createDeviceApp());
  });

  beforeEach(async () => {
    await db.delete(mobileDeviceTable);
    await db.insert(mobileDeviceTable).values({
      clientId,
      isEnabled: true,
      creatorId: 1,
      reportTokenHash: await hashDeviceToken(token),
    });
  });

  it("accepts and persists the actual full operations report through real authentication", async () => {
    const response = await send();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { accepted: true, duplicate: false },
    });
    const device = await savedDevice();
    expect(device.model).toBe("contract-model");
    expect(JSON.parse(device.capabilitiesJson || "null")).toMatchObject({
      ops: {
        operations: [...DEVICE_REPORTED_OPERATIONS],
        arbitraryShell: false,
      },
    });
  });

  it.each(["device.audio.delete", "device.shell.exec"])(
    "rejects operation %s with stable 422 and no snapshot update",
    async (operation) => {
      const response = await send([operation]);
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        ok: false,
        data: {
          code: "VALIDATION_FAILED",
          details: [
            { type: "detail_error", message: "Invalid operations capability" },
          ],
        },
      });
      expect(await savedDevice()).toMatchObject({
        model: null,
        capabilitiesJson: null,
        updateTimeUtc: null,
      });
    }
  );

  it.each(["wrong-local-token", ""])(
    "still rejects a valid capability report with invalid token %j",
    async (reportToken) => {
      const response = await send(undefined, reportToken);
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ ok: false });
      expect(await savedDevice()).toMatchObject({
        capabilitiesJson: null,
        updateTimeUtc: null,
      });
    }
  );
});
