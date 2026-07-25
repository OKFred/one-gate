import { useEffect, useState } from 'react';
import { listAllFn } from '@/api/admin/i18n/translation';
import { setTranslations, mergeTranslations } from './useTranslation';
import zhCN from '../locales/zh-CN';
import enUS from '../locales/en-US';

/**
 * 应用启动时加载多语言数据（不依赖登录状态）
 *
 * 双层加载机制：
 *  ① 同步写入本地静态文案（立即可用，无需等待接口，消除白屏）
 *  ② 异步拉取数据库动态文案，通过 mergeTranslations 覆盖同名 key（后端热修复优先）
 *
 * @returns 是否已完成动态文案加载（本地文案写入后即为 true，不等待接口）
 */
export function useLoadTranslations(): boolean {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ① 同步写入本地共享文案（兜底，立即可用）
    setTranslations('zh-CN', zhCN);
    setTranslations('en-US', enUS);

    // 本地文案写入后立即标记为已加载，避免白屏
    setIsLoaded(true);

    // ② 异步拉取数据库动态文案（merge 覆盖，实现后端热修复）
    const loadDynamic = async () => {
      try {
        const response = await listAllFn({
          data: { isEnabled: true, application: 'frontend' },
          ignoreAbort: true,
        });

        if (response.data?.ok && response.data?.data) {
          const i18nList = response.data.data as Array<{
            langCode?: string;
            tKey?: string;
            tValue?: string;
          }>;

          // 按语言聚合
          const grouped: Record<string, Record<string, string>> = {};
          i18nList.forEach((item) => {
            if (!item?.langCode || !item?.tKey || !item?.tValue) return;
            if (!grouped[item.langCode]) grouped[item.langCode] = {};
            grouped[item.langCode][item.tKey] = item.tValue;
          });

          // mergeTranslations = { ...local, ...api }，接口数据优先覆盖本地
          Object.entries(grouped).forEach(([lang, map]) => mergeTranslations(lang, map));

          const total = Object.values(grouped).reduce((acc, m) => acc + Object.keys(m).length, 0);
          console.log(
            `✅ 动态文案已 merge，共 ${total} 条覆盖项，涉及 ${Object.keys(grouped).length} 种语言`,
          );
        } else {
          console.warn('⚠️ 获取动态多语言失败：响应数据格式错误');
        }
      } catch (error) {
        console.error('❌ 加载动态多语言失败：', error);
      }
    };

    loadDynamic();
  }, []);

  return isLoaded;
}
