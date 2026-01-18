import type { NodeHonoContext } from "@/types/app";
import {
  getTranslation,
  getSupportedLanguages,
  isI18nCacheInitialized,
} from "./cache";

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - Accept-Language 请求头
 * @returns 翻译函数，从数据库缓存中读取翻译
 */
export const createTranslator = (
  langCode?: string
): ((key: string) => string) => {
  // 如果缓存未初始化，先记录警告
  if (!isI18nCacheInitialized()) {
    console.warn("⚠️  多语言缓存尚未初始化，将返回原始 key");
  }

  // 获取支持的语言列表
  const supportedLanguages = getSupportedLanguages();

  // 如果没有支持的语言，回退到默认语言
  const defaultLang = "zh-CN";
  const language =
    langCode && supportedLanguages.includes(langCode)
      ? langCode
      : supportedLanguages.length > 0
        ? supportedLanguages.includes(defaultLang)
          ? defaultLang
          : supportedLanguages[0]
        : defaultLang;

  return (key: string): string => {
    return getTranslation(language, key, defaultLang);
  };
};

/**
 * 从上下文中获取翻译函数
 * @param c - Hono 上下文对象
 * @returns 翻译函数
 */
export const getTranslator = (c: NodeHonoContext) => {
  return createTranslator(
    c.get("userObj")?.langCode ||
      c.req.header("locale") ||
      c.req.header("Accept-Language")
  );
};

// 导出缓存管理函数
export { loadI18nCache, reloadI18nCache, getCacheStats } from "./cache";
