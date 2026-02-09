/**
 * 多语言缓存管理模块
 * 使用缓存抽象层实现，API 兼容 Cloudflare Workers KV
 */

import translationService from "@/api/i18n/translation/service";
import { CacheNamespaces } from "@/middleware/cache";

let isInitialized = false;

/**
 * 从数据库加载所有多语言数据并构建缓存
 */
export async function loadTranslationCache(): Promise<void> {
  try {
    // 1. 清空旧缓存
    await CacheNamespaces.I18nTranslation.clear();

    // 2. 使用 listAll 获取所有启用的多语言数据
    const translations = await translationService.listAll.service({
      isEnabled: true,
      application: "backend", // 只加载后端的多语言数据
      orderBy: "id",
      descend: false,
    });

    // 3. 按语言分组并批量写入缓存
    // 缓存键格式: {langCode}:{tKey}
    const languageSet = new Set<string>();
    const cachePromises = translations.map((item) => {
      const cacheKey = `${item.langCode}:${item.tKey}`;
      languageSet.add(item.langCode);
      return CacheNamespaces.I18nTranslation.put(cacheKey, item.tValue);
    });

    await Promise.all(cachePromises);

    isInitialized = true;
    console.log(
      `✅ 多语言缓存加载成功: ${translations.length} 条记录，${languageSet.size} 种语言`
    );

    // 4. 通知 i18n/index.ts 刷新语言列表缓存
    // 通过导出一个事件或回调来解耦
  } catch (error) {
    console.error("❌ 多语言缓存加载失败:", error);
    throw error;
  }
}

/**
 * 重新加载多语言缓存
 * 在增删改多语言数据时调用
 */
export async function reloadTranslationCache(): Promise<void> {
  console.log("🔄 重新加载多语言缓存...");
  await loadTranslationCache();
}

/**
 * 获取指定语言的翻译
 */
export async function getTranslation(
  langCode: string,
  key: string,
  fallbackLangCode = process.env.LOCALE
): Promise<string> {
  if (!isInitialized) {
    console.warn("⚠️  多语言缓存未初始化，返回原始 key");
    return key;
  }

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

/**
 * 获取所有支持的语言代码
 */
export async function getSupportedLanguages(): Promise<string[]> {
  // 通过遍历缓存键获取所有语言代码
  const listResult = await CacheNamespaces.I18nTranslation.list({
    limit: 10000,
  });
  const languages = new Set<string>();

  for (const item of listResult.keys) {
    const langCode = item.name.split(":")[0];
    if (langCode) {
      languages.add(langCode);
    }
  }

  return Array.from(languages);
}

/**
 * 检查是否已初始化
 */
export function isTranslationCacheInitialized(): boolean {
  return isInitialized;
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats() {
  const stats = await CacheNamespaces.I18nTranslation.getStats();
  const languages = await getSupportedLanguages();

  // 统计每种语言的文案数量
  const languageStats = await Promise.all(
    languages.map(async (lang) => {
      const listResult = await CacheNamespaces.I18nTranslation.list({
        prefix: `${lang}:`,
        limit: 10000,
      });
      return {
        langCode: lang,
        count: listResult.keys.length,
      };
    })
  );

  return {
    totalLanguages: languages.length,
    totalKeys: stats.keys,
    hitRate: stats.hitRate,
    languages: languageStats,
  };
}
