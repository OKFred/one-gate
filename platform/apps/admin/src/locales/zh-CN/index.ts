import { system } from './system';
import { home } from './home';
import { mail } from './mail';
import { maintenance } from './maintenance';
import { ai } from './ai';
import { swarm } from './swarm';
import { i18n } from './i18n';
import { oss } from './oss';
import { rpa } from './rpa';
import { data } from './data';
import { mqtt } from './mqtt';
import { base } from './base';
import { voice } from './voice';
import { mobile } from './mobile';

/**
 * admin app zh-CN 翻译聚合入口
 * 在 App.tsx 启动时通过 mergeTranslations 注入
 */
export default {
  ...system,
  ...mobile,
  ...home,
  ...mail,
  ...maintenance,
  ...ai,
  ...swarm,
  ...i18n,
  ...oss,
  ...rpa,
  ...data,
  ...mqtt,
  ...base,
  ...voice,
} as const satisfies Record<string, string>;
