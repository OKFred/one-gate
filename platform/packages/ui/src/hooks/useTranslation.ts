import { useMemo, useSyncExternalStore } from 'react';
import { authUtils } from '@/utils/auth';

type LangCode = string;
type Translations = Record<string, string>;

// 全局共享翻译状态与订阅机制（防止多实例微前端下状态隔离）
const globalKey = Symbol.for('__HODOR_TRANSLATION_STATE__');
const globalState = (globalThis as any)[globalKey] || {
  translationCache: {} as Record<LangCode, Translations>,
  version: 0,
  subscribers: new Set<() => void>(),
};
(globalThis as any)[globalKey] = globalState;

const fallbackLangCode = navigator.languages.some((str) => str.includes('zh')) ? 'zh-CN' : 'en-US';

const notify = () => {
  globalState.version += 1;
  globalState.subscribers.forEach((fn: () => void) => {
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
  globalState.translationCache[lang] = map || {};
  notify();
};

export const mergeTranslations = (langCode: LangCode, map: Translations) => {
  const lang = langCode || fallbackLangCode;
  globalState.translationCache[lang] = {
    ...(globalState.translationCache[lang] || {}),
    ...(map || {}),
  };
  notify();
};

export const clearTranslations = (langCode?: LangCode) => {
  if (langCode) {
    delete globalState.translationCache[langCode];
  } else {
    globalState.translationCache = {};
  }
  notify();
};

export const getTranslations = (langCode?: LangCode): Translations => {
  const lang = langCode || fallbackLangCode;
  return globalState.translationCache[lang] || {};
};

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - 语言代码
 * @returns 翻译函数，如果找不到文案则原样返回
 */
export const createTranslator = (langCode?: LangCode) => {
  const language = langCode || fallbackLangCode;

  return (key: string, params?: Record<string, string | number>): string => {
    const translations = globalState.translationCache[language] || {};
    let text = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
      });
    }
    return text;
  };
};

// React 18 推荐的外部状态订阅方式
const subscribe = (callback: () => void) => {
  globalState.subscribers.add(callback);
  return () => globalState.subscribers.delete(callback);
};
const getSnapshot = () => globalState.version;

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
