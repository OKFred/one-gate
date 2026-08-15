import { beforeEach, describe, expect, it, vi } from "vitest";

import * as repository from "./repository.js";
import { getConfigByKey } from "./service.js";

vi.mock("./repository.js", () => ({
  findByNamespaceAndKey: vi.fn(),
}));

describe("系统配置精确读取", () => {
  beforeEach(() => {
    vi.mocked(repository.findByNamespaceAndKey).mockReset();
  });

  it("按 namespace 和 configKey 精确读取并解析配置值", async () => {
    vi.mocked(repository.findByNamespaceAndKey).mockResolvedValue({
      id: 1,
      namespace: "oss",
      configKey: "mobile-client-release",
      isEnabled: true,
      isPrimary: false,
      configValue: JSON.stringify({ bucket: "mobile-client-releases" }),
      remark: null,
      creatorId: 1,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: null,
    });

    await expect(
      getConfigByKey("oss", "mobile-client-release")
    ).resolves.toMatchObject({
      configKey: "mobile-client-release",
      isEnabled: true,
      isPrimary: false,
      configValue: { bucket: "mobile-client-releases" },
    });
    expect(repository.findByNamespaceAndKey).toHaveBeenCalledWith(
      "oss",
      "mobile-client-release"
    );
  });

  it("配置不存在时返回 null 而不是读取主配置", async () => {
    vi.mocked(repository.findByNamespaceAndKey).mockResolvedValue(undefined);

    await expect(
      getConfigByKey("oss", "mobile-client-release")
    ).resolves.toBeNull();
  });
});
