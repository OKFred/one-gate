import { workflow } from './workflow';
import { attendance } from './attendance';
import { edm } from './edm';

/**
 * enterprise app zh-CN 翻译聚合入口
 */
export default {
  ...workflow,
  ...attendance,
  ...edm,
} as const satisfies Record<string, string>;
