import { useEffect } from 'react';
import { listAllFn } from '@/api/i18n/translation';
import { setTranslations } from './useTranslation';

/**
 * 应用启动时加载多语言数据（不依赖登录状态）
 */
export function useLoadTranslations() {
  useEffect(() => {
    const loadTranslationList = async () => {
      try {
        const response = await listAllFn({ data: { isEnabled: true, application: 'frontend' } });

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

          // 写入内存翻译缓存
          Object.entries(grouped).forEach(([lang, map]) => setTranslations(lang, map));

          const total = Object.values(grouped).reduce((acc, m) => acc + Object.keys(m).length, 0);
          console.log(
            `✅ 多语言列表已加载到内存，共 ${total} 条数据，涉及 ${Object.keys(grouped).length} 种语言`,
          );
        } else {
          console.warn('⚠️ 获取多语言列表失败：响应数据格式错误');
        }
      } catch (error) {
        console.error('❌ 加载多语言列表失败：', error);
      }
    };

    loadTranslationList();
  }, []);
}
