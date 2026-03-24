// @ts-nocheck
/**
 * 多语言缓存测试
 * 运行: npx tsx src/middleware/cache/__tests__/i18n.test.ts
 */

import { CacheNamespaces } from "../../src/middleware/cache/index";

/**
 * 模拟数据：多语言翻译
 */
const mockTranslations = [
  { langCode: "zh-CN", tKey: "common.save", tValue: "保存" },
  { langCode: "zh-CN", tKey: "common.cancel", tValue: "取消" },
  { langCode: "zh-CN", tKey: "common.delete", tValue: "删除" },
  { langCode: "zh-CN", tKey: "error.not_found", tValue: "未找到资源" },

  { langCode: "en-US", tKey: "common.save", tValue: "Save" },
  { langCode: "en-US", tKey: "common.cancel", tValue: "Cancel" },
  { langCode: "en-US", tKey: "common.delete", tValue: "Delete" },
  { langCode: "en-US", tKey: "error.not_found", tValue: "Resource not found" },

  { langCode: "ja-JP", tKey: "common.save", tValue: "保存" },
  { langCode: "ja-JP", tKey: "common.cancel", tValue: "キャンセル" },
];

/**
 * 测试基础功能
 */
async function testBasicOperations() {
  console.log("\n=== 测试多语言缓存基础功能 ===\n");

  // 1. 清空缓存
  await CacheNamespaces.I18nTranslation.clear();
  console.log("1. 已清空缓存\n");

  // 2. 批量写入翻译数据
  console.log("2. 批量写入翻译数据...");
  const writePromises = mockTranslations.map((item) => {
    const cacheKey = `${item.langCode}:${item.tKey}`;
    return CacheNamespaces.I18nTranslation.put(cacheKey, item.tValue);
  });
  await Promise.all(writePromises);
  console.log(`  已写入 ${mockTranslations.length} 条翻译\n`);

  // 3. 读取翻译
  console.log("3. 测试读取翻译:");
  const zhSave = await CacheNamespaces.I18nTranslation.get("zh-CN:common.save");
  const enSave = await CacheNamespaces.I18nTranslation.get("en-US:common.save");
  const jaCancel = await CacheNamespaces.I18nTranslation.get(
    "ja-JP:common.cancel"
  );

  console.log(`  zh-CN:common.save => "${zhSave}"`);
  console.log(`  en-US:common.save => "${enSave}"`);
  console.log(`  ja-JP:common.cancel => "${jaCancel}"`);

  console.assert(zhSave === "保存", "❌ 中文测试失败");
  console.assert(enSave === "Save", "❌ 英文测试失败");
  console.assert(jaCancel === "キャンセル", "❌ 日文测试失败");
  console.log("  ✅ 读取测试通过\n");
}

/**
 * 测试列表功能
 */
async function testListOperations() {
  console.log("\n=== 测试列表功能 ===\n");

  // 1. 列出所有键
  console.log("1. 列出所有翻译键:");
  const allKeys = await CacheNamespaces.I18nTranslation.list({ limit: 100 });
  console.log(`  总共 ${allKeys.keys.length} 个键`);
  console.log(
    `  前 5 个: ${allKeys.keys
      .slice(0, 5)
      .map((k) => k.name)
      .join(", ")}\n`
  );

  // 2. 按前缀过滤（列出所有中文翻译）
  console.log("2. 列出所有中文翻译 (zh-CN:*):");
  const zhKeys = await CacheNamespaces.I18nTranslation.list({
    prefix: "zh-CN:",
    limit: 100,
  });
  console.log(`  找到 ${zhKeys.keys.length} 个中文翻译`);
  zhKeys.keys.forEach((k) => {
    console.log(`    - ${k.name}`);
  });
  console.log();

  // 3. 按前缀过滤（列出所有 common.* 键）
  console.log("3. 统计每种语言的翻译数量:");
  const languages = ["zh-CN", "en-US", "ja-JP"];
  for (const lang of languages) {
    const result = await CacheNamespaces.I18nTranslation.list({
      prefix: `${lang}:`,
      limit: 100,
    });
    console.log(`  ${lang}: ${result.keys.length} 条`);
  }
  console.log("  ✅ 列表测试通过\n");
}

/**
 * 测试获取支持的语言
 */
async function testGetSupportedLanguages() {
  console.log("\n=== 测试获取支持的语言 ===\n");

  const listResult = await CacheNamespaces.I18nTranslation.list({
    limit: 1000,
  });
  const languages = new Set<string>();

  for (const item of listResult.keys) {
    const langCode = item.name.split(":")[0];
    if (langCode) {
      languages.add(langCode);
    }
  }

  const supportedLanguages = Array.from(languages).sort();
  console.log("支持的语言:");
  supportedLanguages.forEach((lang) => console.log(`  - ${lang}`));

  console.assert(supportedLanguages.includes("zh-CN"), "❌ 缺少中文");
  console.assert(supportedLanguages.includes("en-US"), "❌ 缺少英文");
  console.assert(supportedLanguages.includes("ja-JP"), "❌ 缺少日文");
  console.log("  ✅ 语言检测通过\n");
}

/**
 * 测试缓存统计
 */
async function testCacheStats() {
  console.log("\n=== 测试缓存统计 ===\n");

  // 重置统计
  CacheNamespaces.I18nTranslation.resetStats();

  // 模拟一些读取操作
  await CacheNamespaces.I18nTranslation.get("zh-CN:common.save"); // 命中
  await CacheNamespaces.I18nTranslation.get("zh-CN:common.cancel"); // 命中
  await CacheNamespaces.I18nTranslation.get("zh-CN:not.exist"); // 未命中
  await CacheNamespaces.I18nTranslation.get("en-US:common.save"); // 命中

  const stats = await CacheNamespaces.I18nTranslation.getStats();

  console.log("缓存统计:");
  console.log(`  总键数: ${stats.keys}`);
  console.log(`  命中次数: ${stats.hits}`);
  console.log(`  未命中次数: ${stats.misses}`);
  console.log(`  命中率: ${(stats.hitRate * 100).toFixed(2)}%`);

  console.assert(stats.keys > 0, "❌ 键数统计错误");
  console.assert(stats.hits === 3, "❌ 命中次数错误");
  console.assert(stats.misses === 1, "❌ 未命中次数错误");
  console.log("  ✅ 统计测试通过\n");
}

/**
 * 测试回退逻辑
 */
async function testFallbackLogic() {
  console.log("\n=== 测试回退逻辑 ===\n");

  // 模拟获取翻译的函数
  async function getTranslation(
    langCode: string,
    key: string,
    fallbackLangCode: string = "en-US"
  ): Promise<string> {
    // 先尝试获取指定语言的翻译
    const cacheKey = `${langCode}:${key}`;
    const translation = await CacheNamespaces.I18nTranslation.get(cacheKey);
    if (translation) {
      return translation;
    }

    // 如果找不到，尝试使用回退语言
    if (langCode !== fallbackLangCode) {
      const fallbackKey = `${fallbackLangCode}:${key}`;
      const fallbackTranslation =
        await CacheNamespaces.I18nTranslation.get(fallbackKey);
      if (fallbackTranslation) {
        return fallbackTranslation;
      }
    }

    // 如果都找不到，返回原始 key
    return key;
  }

  console.log("1. 测试正常翻译:");
  const t1 = await getTranslation("zh-CN", "common.save");
  console.log(`  zh-CN:common.save => "${t1}"`);
  console.assert(t1 === "保存", "❌ 正常翻译失败");

  console.log("\n2. 测试回退到英文:");
  const t2 = await getTranslation("ja-JP", "common.delete"); // 日文没有 delete
  console.log(`  ja-JP:common.delete (不存在) => "${t2}"`);
  console.assert(t2 === "Delete", "❌ 回退失败");

  console.log("\n3. 测试键不存在:");
  const t3 = await getTranslation("zh-CN", "not.exist.key");
  console.log(`  zh-CN:not.exist.key => "${t3}"`);
  console.assert(t3 === "not.exist.key", "❌ 键不存在处理失败");

  console.log("  ✅ 回退逻辑测试通过\n");
}

/**
 * 性能测试
 */
async function testPerformance() {
  console.log("\n=== 性能测试 ===\n");

  const iterations = 1000;

  console.log(`批量读取 ${iterations} 次翻译...`);
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < iterations; i++) {
    const lang = i % 2 === 0 ? "zh-CN" : "en-US";
    const keys = ["common.save", "common.cancel", "common.delete"];
    const key = keys[i % keys.length];
    promises.push(CacheNamespaces.I18nTranslation.get(`${lang}:${key}`));
  }

  await Promise.all(promises);

  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log(`  耗时: ${duration}ms`);
  console.log(`  平均: ${(duration / iterations).toFixed(3)}ms/次`);
  console.log(`  QPS: ${Math.round(iterations / (duration / 1000))}`);
  console.log("  ✅ 性能测试完成\n");
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log("🧪 开始测试多语言缓存\n");
  console.log("=".repeat(50));

  try {
    await testBasicOperations();
    await testListOperations();
    await testGetSupportedLanguages();
    await testCacheStats();
    await testFallbackLogic();
    await testPerformance();

    console.log("=".repeat(50));
    console.log("\n✅ 所有测试通过！\n");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
