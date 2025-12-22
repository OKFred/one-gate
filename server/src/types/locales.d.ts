import zhCN from "@/locales/zh-CN";

export type LanguageKey = keyof typeof zhCN;
export type LanguageValue = (typeof zhCN)[LanguageKey];
