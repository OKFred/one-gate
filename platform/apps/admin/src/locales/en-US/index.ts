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

export default {
  ...system,
  ...home,
  ...mail,
  ...maintenance,
  ...ai,
  ...swarm,
  ...i18n,
  ...oss,
  ...rpa,
  ...data,
} as const satisfies Record<string, string>;
