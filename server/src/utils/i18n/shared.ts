import { kv } from "@/middleware/cache";
import translationService from "@/api/i18n/translation/service";

/**
 * 获取翻译文案 (懒加载模式)
 * 逻辑：先查缓存，查不到再查数据库并回填缓存
 */
export async function getTranslation(
  langCode: string,
  key: string
): Promise<string> {
  const cacheKey = `${langCode}:${key}`;

  try {
    // 1. 尝试从 KV 缓存获取
    const cachedValue = await kv.get<string>(cacheKey);
    if (cachedValue !== null) {
      // console.log("cache hit", cacheKey);
      return cachedValue;
    }

    // 2. 缓存未命中，从数据库获取
    // 由于 list 使用 keyword 进行模糊匹配，我们需要手动过滤出精确匹配项
    const translations = await translationService.list.service({
      application: "backend",
      keyword: key,
      langCode: langCode,
      pageNo: 1,
      pageSize: 10,
    });

    const match = translations.list.find((item) => item.tKey === key);

    if (match) {
      // console.log("cache miss", cacheKey);
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
