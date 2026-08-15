import { beforeEach, describe, expect, it, vi } from "vitest";

import { registry } from "../../common/registry.js";
import { getEnabledConfigByName } from "./service.js";

vi.mock("../../common/registry.js", () => ({
  registry: {
    base: {
      sysConfig: {
        getConfigByKey: vi.fn(),
      },
    },
  },
}));

describe("OSS 命名配置读取", () => {
  const getConfigByKey = vi.mocked(registry.base.sysConfig.getConfigByKey);

  beforeEach(() => {
    getConfigByKey.mockReset();
  });

  it("返回精确匹配且启用的配置值", async () => {
    getConfigByKey.mockResolvedValue({
      id: 1,
      namespace: "oss",
      configKey: "mobile-client-release",
      isEnabled: true,
      isPrimary: false,
      configValue: { bucket: "mobile-client-releases" },
      remark: null,
      creatorId: 1,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: null,
    });

    await expect(
      getEnabledConfigByName("mobile-client-release")
    ).resolves.toEqual({ bucket: "mobile-client-releases" });
  });

  it("配置不存在时失败且不读取默认配置", async () => {
    getConfigByKey.mockResolvedValue(null);

    await expect(
      getEnabledConfigByName("mobile-client-release")
    ).rejects.toMatchObject({
      meta: { message: "对象存储配置 mobile-client-release 不存在" },
    });
  });

  it("配置被禁用时失败且不回退", async () => {
    getConfigByKey.mockResolvedValue({
      id: 1,
      namespace: "oss",
      configKey: "mobile-client-release",
      isEnabled: false,
      isPrimary: false,
      configValue: { bucket: "mobile-client-releases" },
      remark: null,
      creatorId: 1,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: null,
    });

    await expect(
      getEnabledConfigByName("mobile-client-release")
    ).rejects.toMatchObject({
      meta: { message: "对象存储配置 mobile-client-release 已禁用" },
    });
  });
});
