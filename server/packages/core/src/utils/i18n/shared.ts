import { kv } from "../../middleware/cache/index.js";
import { findByKeyAndLang } from "../../../../admin/src/i18n/translation/repository";

/**
 * 获取翻译文案 (懒加载模式)
 * 逻辑：先查缓存，查不到再查数据库并回填缓存
 */
export async function getTranslation(
  langCode: string,
  key: string
): Promise<string> {
  const cacheKey = `i18n.translation:${langCode}.${key}`;

  try {
    // 1. 尝试从 KV 缓存获取
    const cachedValue = await kv.get<string>(cacheKey);
    if (cachedValue !== null) {
      return cachedValue;
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
      return match.tValue as string;
    }
  } catch (error) {
    console.error(
      `[I18n Cache] Failed to fetch translation for ${cacheKey}:`,
      error
    );
  }

  // 4. 最终兜底返回原始 key
  return key;
}
