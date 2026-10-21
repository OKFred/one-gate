import { workflow } from './workflow';
import { attendance } from './attendance';
import { edm } from './edm';
import { assetManagement } from './assets';

export default {
  ...workflow,
  ...attendance,
  ...edm,
  ...assetManagement,
} as const satisfies Record<string, string>;
