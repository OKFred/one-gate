import { useMemo, useState, useEffect } from 'react';
import { authUtils } from '@/utils/auth';
import { indexedDBHelper } from '@/utils/indexedDB';

// 翻译数据缓存
let translationCache: Record<string, Record<string, string>> = {};
let isLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * 从 IndexedDB 加载翻译数据到缓存
 */
const loadTranslationsFromDB = async (): Promise<void> => {
  // 如果已加载，直接返回
  if (isLoaded) return;

  // 如果正在加载，返回同一个 Promise
  if (loadingPromise) return loadingPromise;

  // 开始加载
  loadingPromise = (async () => {
    try {
      await indexedDBHelper.init();
      const data = await indexedDBHelper.getTranslationList();

      // 重置缓存
      translationCache = {};

      // 按语言代码分组
      data.forEach((item) => {
        if (!item.langCode) return;
        if (!translationCache[item.langCode]) {
          translationCache[item.langCode] = {};
        }
        const fullKey = `${item.tKey}`;
        if (!item.tValue) return;
        translationCache[item.langCode][fullKey] = item.tValue;
      });

      isLoaded = true;
    } catch (error) {
      console.error('❌ 加载多语言数据失败：', error);
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - 语言代码
 * @returns 翻译函数，如果找不到文案则原样返回
 */
export const createTranslator = (langCode?: string) => {
  const language = langCode || 'zh-CN';

  return (key: string): string => {
    const translations = translationCache[language] || {};
    return translations[key] || key;
  };
};

/**
 * 翻译钩子
 * @returns 翻译函数
 */
export const useTranslation = () => {
  const userInfo = authUtils.getUserInfo();
  const langCode = userInfo?.langCode || 'zh-CN';
  const [isReady, setIsReady] = useState(isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      async function init() {
        await loadTranslationsFromDB();
        setIsReady(true);
      }
      init();
    }
  }, []);

  const t = useMemo(() => createTranslator(langCode), [langCode, isReady]);

  return t;
};
