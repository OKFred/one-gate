import { common } from './common';
import { components } from './components';
import { sidebar } from './sidebar';
import { auth } from './auth';
import { cron } from './cron';

/**
 * zh-CN 共享翻译聚合入口
 * 运行时 flat KV，与 useTranslation 完全兼容
 */
export default {
  ...common,
  ...components,
  ...sidebar,
  ...auth,
  ...cron,
} as const satisfies Record<string, string>;
