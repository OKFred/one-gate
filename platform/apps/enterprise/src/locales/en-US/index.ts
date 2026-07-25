import { workflow } from './workflow';
import { attendance } from './attendance';
import { edm } from './edm';

export default {
  ...workflow,
  ...attendance,
  ...edm,
} as const satisfies Record<string, string>;
