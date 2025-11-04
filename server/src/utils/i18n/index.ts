import zhCN from "@/locales/zh-CN";
import enUS from "@/locales/en-US";
import type { LanguageKey, LanguageValue } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";

const languageObj = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - Accept-Language 请求头
 * @returns 翻译函数，如果找不到文案则原样返回
 */
export const createTranslator = (
  langCode?: string
): ((key: LanguageKey) => LanguageValue) => {
  const supportedLanguages = ["en-US", "zh-CN"];
  const language = supportedLanguages.includes(langCode || "")
    ? langCode!
    : "zh-CN";

  return (key: LanguageKey): LanguageValue => {
    const translations = languageObj[language];
    return translations[key as LanguageKey] || key;
  };
};

/**
 * 从上下文中获取翻译函数
 * @param c - Hono 上下文对象
 * @returns 翻译函数
 */
export const getTranslator = (c: NodeHonoContext) => {
  return createTranslator(
    c.req.header("locale") || c.req.header("Accept-Language")
  );
};
