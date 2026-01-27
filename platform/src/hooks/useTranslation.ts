import { useMemo, useSyncExternalStore } from 'react';
import { authUtils } from '@/utils/auth';

type LangCode = string;
type Translations = Record<string, string>;

// 内存中的翻译缓存与订阅机制
let translationCache: Record<LangCode, Translations> = {};
let version = 0;
const subscribers = new Set<() => void>();
const fallbackLangCode = navigator.languages.some((str) => str.includes('zh')) ? 'zh-CN' : 'en-US';
const notify = () => {
  version += 1;
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
};

// 对外暴露的内存操作 API
export const setTranslations = (langCode: LangCode, map: Translations) => {
  const lang = langCode || fallbackLangCode;
  translationCache[lang] = map || {};
  notify();
};

export const mergeTranslations = (langCode: LangCode, map: Translations) => {
  const lang = langCode || fallbackLangCode;
  translationCache[lang] = { ...(translationCache[lang] || {}), ...(map || {}) };
  notify();
};

export const clearTranslations = (langCode?: LangCode) => {
  if (langCode) {
    delete translationCache[langCode];
  } else {
    translationCache = {};
  }
  notify();
};

export const getTranslations = (langCode?: LangCode): Translations => {
  const lang = langCode || fallbackLangCode;
  return translationCache[lang] || {};
};

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - 语言代码
 * @returns 翻译函数，如果找不到文案则原样返回
 */
export const createTranslator = (langCode?: LangCode) => {
  const language = langCode || fallbackLangCode;

  return (key: string): string => {
    const translations = translationCache[language] || {};
    return translations[key] || key;
  };
};

// React 18 推荐的外部状态订阅方式
const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};
const getSnapshot = () => version;

/**
 * 翻译钩子：依赖用户语言与内存版本进行更新
 * @returns 翻译函数
 */
export const useTranslation = () => {
  const userInfo = authUtils.getUserInfo();
  const langCode = userInfo?.langCode || fallbackLangCode;
  useSyncExternalStore(subscribe, getSnapshot);
  const t = useMemo(() => createTranslator(langCode), [langCode]);

  return t;
};
