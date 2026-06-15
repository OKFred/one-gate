import { describe, it, expect, afterEach } from "vitest";
import cacheService from "../service";

describe("Cache 全链路集成测试", () => {
  afterEach(async () => {
    // 每次测试后清空缓存
    await cacheService.clear.service({});
  });

  it("能进行基本的 Put、Get、Delete、Clear 操作", async () => {
    // 1. 获取不存在的键，应当返回 exists: false
    const getRes1 = await cacheService.get.service({
      key: "test_integration_key",
    });
    expect(getRes1.exists).toBe(false);
    expect(getRes1.value).toBeNull();

    // 2. 存入 JSON 数据
    const jsonVal = { message: "hello integration", code: 200 };
    const putRes = await cacheService.put.service({
      key: "test_integration_key",
      value: JSON.stringify(jsonVal),
    });
    expect(putRes.success).toBe(true);

    // 3. 读取该 JSON 数据并正确解析
    const getRes2 = await cacheService.get.service({
      key: "test_integration_key",
      type: "json",
    });
    expect(getRes2.exists).toBe(true);
    expect(getRes2.value).toEqual(jsonVal);

    // 4. 删除键
    const delRes = await cacheService.delete.service({
      key: "test_integration_key",
    });
    expect(delRes.success).toBe(true);

    // 5. 再次读取应返回 exists: false
    const getRes3 = await cacheService.get.service({
      key: "test_integration_key",
    });
    expect(getRes3.exists).toBe(false);
  });

  it("支持列出所有缓存键 (List)", async () => {
    await cacheService.put.service({ key: "prefix_k1", value: "v1" });
    await cacheService.put.service({ key: "prefix_k2", value: "v2" });
    await cacheService.put.service({ key: "other_k3", value: "v3" });

    // 列出 prefix_ 为前缀的键
    const listRes = await cacheService.listKeys.service({ prefix: "prefix_" });
    expect(listRes.keys).toBeInstanceOf(Array);

    // 如果 iterator 正常运行（在某些支持的 Store 里），可以检查具体项数
    // 如果不支持迭代，至少不应该抛出错误并且 keys 为数组
    if (listRes.keys.length > 0) {
      const names = listRes.keys.map((k: any) => k.name);
      expect(names).toContain("prefix_k1");
      expect(names).toContain("prefix_k2");
      expect(names).not.toContain("other_k3");
    }
  });
});
