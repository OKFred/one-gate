import { common } from './common';
import { components } from './components';
import { sidebar } from './sidebar';
import { auth } from './auth';

/**
 * en-US 共享翻译聚合入口
 */
export default {
  ...common,
  ...components,
  ...sidebar,
  ...auth,
} as const satisfies Record<string, string>;
