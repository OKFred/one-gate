/**
 * 多语言缓存管理模块
 * 使用内存 Map 实现同步读取，避免 async/await 影响现有代码
 */

import translationService from "@/api/i18n/translation/service";

let isInitialized = false;

// 内存缓存：{langCode}:{tKey} -> tValue
const translationMap = new Map<string, string>();

// 语言列表缓存
const supportedLanguages = new Set<string>();

// 统计信息
let hits = 0;
let misses = 0;

/**
 * 从数据库加载所有多语言数据并构建缓存
 */
export async function loadTranslationCache(): Promise<void> {
  try {
    // 1. 清空旧缓存
    translationMap.clear();
    supportedLanguages.clear();
    hits = 0;
    misses = 0;

    // 2. 使用 listAll 获取所有启用的多语言数据
    const translations = await translationService.listAll.service({
      isEnabled: true,
      application: "backend", // 只加载后端的多语言数据
      orderBy: "id",
      descend: false,
    });

    // 3. 加载到内存 Map
    for (const item of translations) {
      const cacheKey = `${item.langCode}:${item.tKey}`;
      translationMap.set(cacheKey, item.tValue);
      supportedLanguages.add(item.langCode);
    }

    isInitialized = true;
    console.log(
      `✅ 多语言缓存加载成功: ${translations.length} 条记录，${supportedLanguages.size} 种语言`
    );
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
 * 获取指定语言的翻译（同步）
 */
export function getTranslation(
  langCode: string,
  key: string,
  fallbackLangCode = process.env.LOCALE
): string {
  if (!isInitialized) {
    console.warn("⚠️  多语言缓存未初始化，返回原始 key");
    return key;
  }

  // 先尝试获取指定语言的翻译
  const cacheKey = `${langCode}:${key}`;
  const translation = translationMap.get(cacheKey);
  if (translation) {
    hits++;
    return translation;
  }

  // 如果找不到，尝试使用回退语言
  if (langCode !== fallbackLangCode) {
    const fallbackKey = `${fallbackLangCode}:${key}`;
    const fallbackTranslation = translationMap.get(fallbackKey);
    if (fallbackTranslation) {
      hits++;
      return fallbackTranslation;
    }
  }

  // 如果都找不到，返回原始 key
  misses++;
  return key;
}

/**
 * 获取所有支持的语言代码（同步）
 */
export function getSupportedLanguages(): string[] {
  return Array.from(supportedLanguages);
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
export function getCacheStats() {
  const languages = getSupportedLanguages();

  // 统计每种语言的文案数量
  const languageStats = languages.map((lang) => {
    const prefix = `${lang}:`;
    let count = 0;
    for (const key of translationMap.keys()) {
      if (key.startsWith(prefix)) {
        count++;
      }
    }
    return {
      langCode: lang,
      count,
    };
  });

  const total = hits + misses;
  return {
    totalLanguages: languages.length,
    totalKeys: translationMap.size,
    hits,
    misses,
    hitRate: total > 0 ? hits / total : 0,
    languages: languageStats,
  };
}
