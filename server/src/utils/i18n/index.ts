import type { NodeHonoContext } from "@/types/app";
import {
  getTranslation,
  getSupportedLanguages,
  isTranslationCacheInitialized,
} from "./cache";
import { getEnv } from "../env";

// 缓存支持的语言列表（避免每次都查询）
let cachedSupportedLanguages: string[] = [];

/**
 * 刷新支持的语言列表缓存
 */
export async function refreshSupportedLanguagesCache(): Promise<void> {
  cachedSupportedLanguages = getSupportedLanguages();
}

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - Accept-Language 请求头
 * @returns 翻译函数，从内存缓存中读取翻译
 */
export const createTranslator = (
  langCode?: string
): ((key: string) => string) => {
  // 如果缓存未初始化，先记录警告
  if (!isTranslationCacheInitialized()) {
    console.warn("⚠️  多语言缓存尚未初始化，将返回原始 key");
  }

  // 获取支持的语言列表（使用缓存）
  const supportedLanguages = cachedSupportedLanguages;

  // 如果没有支持的语言，回退到默认语言
  const defaultLang = getEnv("LOCALE");
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

// 导出缓存统计函数
export { getCacheStats } from "./cache";

/**
 * 加载多语言缓存（包装版本，同时刷新语言列表）
 */
export async function loadTranslationCache(): Promise<void> {
  const { loadTranslationCache: loadCache } = await import("./cache");
  await loadCache();
  await refreshSupportedLanguagesCache();
}

/**
 * 重新加载多语言缓存
 */
export async function reloadTranslationCache(): Promise<void> {
  const { reloadTranslationCache: reloadCache } = await import("./cache");
  await reloadCache();
  await refreshSupportedLanguagesCache();
}
