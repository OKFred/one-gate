type LangCode = string;
type Translations = Record<string, string>;
export declare const setTranslations: (langCode: LangCode, map: Translations) => void;
export declare const mergeTranslations: (langCode: LangCode, map: Translations) => void;
export declare const clearTranslations: (langCode?: LangCode) => void;
export declare const getTranslations: (langCode?: LangCode) => Translations;
/**
 * 创建翻译函数，用于处理消息的多语言替换
 * @param langCode - 语言代码
 * @returns 翻译函数，如果找不到文案则原样返回
 */
export declare const createTranslator: (
  langCode?: LangCode,
) => (key: string, params?: Record<string, string | number>) => string;
/**
 * 翻译钩子：依赖用户语言与内存版本进行更新
 * @returns 翻译函数
 */
export declare const useTranslation: () => (
  key: string,
  params?: Record<string, string | number>,
) => string;
export {};
