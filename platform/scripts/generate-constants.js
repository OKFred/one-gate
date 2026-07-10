import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIRS = [
  path.resolve(__dirname, '../apps/admin/src/pages/infra'),
  path.resolve(__dirname, '../apps/enterprise/src/pages/infra'),
];

function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

function generateConstantFile(dirPath, targetDir) {
  const rel = path.relative(targetDir, dirPath);
  if (!rel) return;
  const parts = rel.split(path.sep);

  const depth = parts.length;
  const lv = depth + 1; // PREFIX_LV2, PREFIX_LV3, etc.

  let imports = '';
  for (let i = 1; i <= depth; i++) {
    const dots = '../'.repeat(depth - i + 1);
    imports += `import { PREFIX_LV${i} } from '${dots}constant';\n`;
  }
  imports += `import { permissions } from '@/hooks/usePermission';\n`;

  const prefixes = [];
  for (let i = 1; i <= lv; i++) {
    prefixes.push(`\${PREFIX_LV${i}}`);
  }
  const fullPrefixStr = '`' + prefixes.join('.') + '` as const';

  const currentDirName = parts[depth - 1];
  let cleanName = toSnakeCase(currentDirName);

  const relPath = parts.map(toSnakeCase).join('/');

  let content = '';

  if (relPath === 'mail/send' || relPath === 'maintenance/openapi') {
    content = `${imports}
export const PREFIX_LV${lv} = '${cleanName}' as const;
export const FULL_PREFIX = ${fullPrefixStr};
export const THIS_PERMISSION = permissions[PREFIX_LV1][PREFIX_LV2];
`;
  } else {
    const permKeys = [];
    for (let i = 1; i <= lv; i++) {
      permKeys.push(`[PREFIX_LV${i}]`);
    }
    const thisPermissionStr = `permissions${permKeys.join('')}`;

    content = `${imports}
export const PREFIX_LV${lv} = '${cleanName}' as const;
export const FULL_PREFIX = ${fullPrefixStr};
export const THIS_PERMISSION = ${thisPermissionStr};
`;
  }

  const constantPath = path.join(dirPath, 'constant.ts');
  fs.writeFileSync(constantPath, content, 'utf8');
  console.log(`[Generated] ${constantPath}`);
}

function traverse(dirPath, targetDir) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === 'components') continue;
      const subPath = path.join(dirPath, entry.name);

      generateConstantFile(subPath, targetDir);
      traverse(subPath, targetDir);
    }
  }
}

console.log('Starting constant.ts generation for all apps...');
for (const targetDir of TARGET_DIRS) {
  if (fs.existsSync(targetDir)) {
    console.log(`\nProcessing target: ${targetDir}`);
    traverse(targetDir, targetDir);
  }
}
console.log('\nFinished all.');
