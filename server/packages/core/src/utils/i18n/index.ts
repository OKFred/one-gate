import type { Context } from "@hodor/core/types/app";
import { getTranslation } from "./shared";
import { getEnv } from "../env";

/**
 * 从上下文中获取翻译函数（异步）
 * @param c - Hono 上下文对象
 * @returns 异步翻译函数
 */
/**
 * 从上下文中获取翻译函数（异步）
 * @param c - Hono 上下文对象
 * @returns 异步翻译函数
 */
export const getTranslator = async (c: Context) => {
  const rawLangCode =
    c.get("userObj")?.langCode ||
    c.req.header("locale") ||
    c.req.header("Accept-Language");

  // 解析 Accept-Language 格式 (例如 "zh-CN,zh;q=0.9" -> "zh-CN")
  const langCode = rawLangCode?.split(",")[0]?.trim();

  return await createTranslator(langCode);
};

/**
 * 创建翻译函数（异步）
 * @param langCode - 目标语言代码
 * @returns 异步翻译函数 (key: string, params?: Record<string, any>) => Promise<string>
 */
const createTranslator = async (
  langCode?: string
): Promise<(key: string, params?: Record<string, any>) => Promise<string>> => {
  return async (key: string, params?: Record<string, any>): Promise<string> => {
    return await getTranslation(
      (langCode || getEnv("LOCALE")) as string,
      key,
      params
    );
  };
};
