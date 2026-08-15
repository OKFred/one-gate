import { describe, expect, it } from "vitest";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { DeviceApplicationError } from "../../application/error.js";
import { adaptDeviceHttpError } from "./error.js";

describe("设备 HTTP 错误边界", () => {
  it("将设备应用异常映射为现有 BusinessError", async () => {
    await expect(
      adaptDeviceHttpError(async () => {
        throw new DeviceApplicationError("Invalid device report token");
      })
    ).rejects.toBeInstanceOf(BusinessError);
  });

  it("基础设施异常保持原样", async () => {
    const infrastructureError = new Error("database unavailable");
    await expect(
      adaptDeviceHttpError(async () => {
        throw infrastructureError;
      })
    ).rejects.toBe(infrastructureError);
  });
});
