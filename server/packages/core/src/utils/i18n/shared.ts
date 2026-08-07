import { kv } from "../../middleware/cache/index.js";
import { findByKeyAndLang } from "../../../../admin/src/i18n/translation/repository";

/**
 * 占位符替换函数
 */
function interpolate(template: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined && params[key] !== null
      ? String(params[key])
      : match;
  });
}

/**
 * 获取翻译文案 (懒加载模式)
 * 逻辑：先查缓存，查不到再查数据库并回填缓存
 */
export async function getTranslation(
  langCode: string,
  key: string,
  params?: Record<string, any>
): Promise<string> {
  const cacheKey = `i18n.translation:${langCode}.${key}`;
  let template = key;

  try {
    // 1. 尝试从 KV 缓存获取
    const cachedValue = await kv.get<string>(cacheKey);
    if (cachedValue !== null) {
      return interpolate(cachedValue, params);
    }

    // 2. 缓存未命中，从数据库精确获取
    const match = await findByKeyAndLang({
      application: "backend",
      tKey: key,
      langCode: langCode,
    });

    if (match && match.tValue) {
      // 3. 查到结果，回填缓存并返回
      await kv.put(cacheKey, match.tValue as string);
      return interpolate(match.tValue as string, params);
    }
  } catch (error) {
    console.error(
      `[I18n Cache] Failed to fetch translation for ${cacheKey}:`,
      error
    );
  }

  // 4. 最终兜底返回原始 key 或插值后的模版
  return interpolate(template, params);
}
