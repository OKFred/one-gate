import { profile } from './profile';
import { social } from './social';
import { health } from './health';
import { financial } from './financial';
import { family } from './family';
import { preference } from './preference';
import { asset } from './asset';

export default {
  ...profile,
  ...social,
  ...health,
  ...financial,
  ...family,
  ...preference,
  ...asset,
} as const satisfies Record<string, string>;
