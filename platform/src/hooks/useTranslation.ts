import { useMemo } from 'react';
import zhCN from '@/locales/zh-CN';
import enUS from '@/locales/en-US';

const languageObj = {
  'en-US': enUS,
  'zh-CN': zhCN,
};

/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - 语言代码
 * @returns 翻译函数，如果找不到文案则原样返回
 */
export const createTranslator = (langCode?: string) => {
  const supportedLanguages = ['en-US', 'zh-CN'];
  const language = supportedLanguages.includes(langCode || '') ? langCode! : 'zh-CN';

  return (key: string): string => {
    const translations = languageObj[language as keyof typeof languageObj];
    return (translations as Record<string, string>)[key] || key;
  };
};

/**
 * 翻译钩子
 * @returns 翻译函数
 */
export const useTranslation = () => {
  const langCode = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';

  const t = useMemo(() => createTranslator(langCode), [langCode]);

  return t;
};