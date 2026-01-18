/**
 * 多语言缓存管理模块
 * 从数据库加载多语言数据并缓存在内存中，提高访问性能
 */

import translationService from "@/api/i18n/translation/service";

// 缓存结构: { [langCode]: { [tKey]: tValue } }
type I18nCache = Record<string, Record<string, string>>;

let i18nCache: I18nCache = {};
let isInitialized = false;

/**
 * 从数据库加载所有多语言数据并构建缓存
 */
export async function loadI18nCache(): Promise<void> {
  try {
    // 使用 listAll 获取所有启用的多语言数据
    const translations = await translationService.listAll.service({
      isEnabled: true,
      application: "backend", // 只加载后端的多语言数据
      orderBy: "id",
      descend: false,
    });

    // 构建缓存结构
    const newCache: I18nCache = {};
    for (const item of translations) {
      if (!newCache[item.langCode]) {
        newCache[item.langCode] = {};
      }
      newCache[item.langCode][item.tKey] = item.tValue;
    }

    i18nCache = newCache;
    isInitialized = true;
    console.log(
      `✅ 多语言缓存加载成功: ${translations.length} 条记录，${Object.keys(newCache).length} 种语言`
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
export async function reloadI18nCache(): Promise<void> {
  console.log("🔄 重新加载多语言缓存...");
  await loadI18nCache();
}

/**
 * 获取指定语言的翻译
 */
export function getTranslation(
  langCode: string,
  key: string,
  fallbackLangCode = "zh-CN"
): string {
  if (!isInitialized) {
    console.warn("⚠️  多语言缓存未初始化，返回原始 key");
    return key;
  }

  // 先尝试获取指定语言的翻译
  const translation = i18nCache[langCode]?.[key];
  if (translation) {
    return translation;
  }

  // 如果找不到，尝试使用回退语言
  if (langCode !== fallbackLangCode) {
    const fallbackTranslation = i18nCache[fallbackLangCode]?.[key];
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
export function getSupportedLanguages(): string[] {
  return Object.keys(i18nCache);
}

/**
 * 检查是否已初始化
 */
export function isI18nCacheInitialized(): boolean {
  return isInitialized;
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  const languages = Object.keys(i18nCache);
  const stats = languages.map((lang) => ({
    langCode: lang,
    count: Object.keys(i18nCache[lang]).length,
  }));
  return {
    totalLanguages: languages.length,
    languages: stats,
  };
}
