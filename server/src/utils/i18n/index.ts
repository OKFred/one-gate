import type { NodeHonoContext } from "@/types/app";
import { getTranslation } from "./shared";
import { getEnv } from "../env";

/**
 * 从上下文中获取翻译函数（异步）
 * @param c - Hono 上下文对象
 * @returns 异步翻译函数
 */
export const getTranslator = async (c: NodeHonoContext) => {
  const langCode =
    c.get("userObj")?.langCode ||
    c.req.header("locale") ||
    c.req.header("Accept-Language");

  return await createTranslator(langCode);
};

/**
 * 创建翻译函数（异步）
 * @param langCode - 目标语言代码
 * @returns 异步翻译函数 (key: string) => Promise<string>
 */
const createTranslator = async (
  langCode?: string
): Promise<(key: string) => Promise<string>> => {
  return async (key: string): Promise<string> => {
    return await getTranslation(langCode || getEnv("LOCALE"), key);
  };
};
