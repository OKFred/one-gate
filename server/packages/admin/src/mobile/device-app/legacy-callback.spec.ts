import { describe, expect, it, vi } from "vitest";
import { DeviceTaskApplicationError } from "../async-task/application/error.js";
import {
  completeAuthenticatedLegacyDeviceAppCallback,
  type LegacyDeviceAppCallbackDependencies,
} from "./legacy-callback.js";

const result = {
  taskId: "task-01",
  status: "SUCCESS",
  message: "done",
} as const;

function createDependencies(): LegacyDeviceAppCallbackDependencies {
  const completion = {
    completed: true,
    task: { cat: "sync", clientId: "mobile-01" },
  };
  return {
    getDeviceTask: vi.fn().mockResolvedValue({ clientId: "mobile-01" }),
    verifyDeviceReportToken: vi.fn().mockResolvedValue(undefined),
    completeLegacyDeviceTask: vi.fn().mockResolvedValue(completion),
  };
}

describe("legacy device-app callback authentication", () => {
  it("reads the task clientId and verifies it before completing the task", async () => {
    const dependencies = createDependencies();

    await completeAuthenticatedLegacyDeviceAppCallback(
      result,
      "device-secret",
      dependencies
    );

    expect(dependencies.getDeviceTask).toHaveBeenCalledWith("task-01");
    expect(dependencies.verifyDeviceReportToken).toHaveBeenCalledWith(
      "mobile-01",
      "device-secret"
    );
    expect(dependencies.completeLegacyDeviceTask).toHaveBeenCalledWith(result);
    expect(
      vi.mocked(dependencies.verifyDeviceReportToken).mock
        .invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(dependencies.completeLegacyDeviceTask).mock
        .invocationCallOrder[0]
    );
  });

  it("never completes the task when device token verification fails", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.verifyDeviceReportToken).mockRejectedValue(
      new Error("invalid token")
    );

    await expect(
      completeAuthenticatedLegacyDeviceAppCallback(
        result,
        "invalid-device-secret",
        dependencies
      )
    ).rejects.toThrow("invalid token");
    expect(dependencies.completeLegacyDeviceTask).not.toHaveBeenCalled();
  });

  it("does not verify or complete an unknown task", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.getDeviceTask).mockResolvedValue(undefined);

    await expect(
      completeAuthenticatedLegacyDeviceAppCallback(
        result,
        "device-secret",
        dependencies
      )
    ).rejects.toBeInstanceOf(DeviceTaskApplicationError);
    expect(dependencies.verifyDeviceReportToken).not.toHaveBeenCalled();
    expect(dependencies.completeLegacyDeviceTask).not.toHaveBeenCalled();
  });
});
