import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIRS = [
  path.resolve(__dirname, '../apps/admin/src/pages'),
  path.resolve(__dirname, '../apps/enterprise/src/pages'),
  path.resolve(__dirname, '../apps/personal/src/pages'),
];

// Pages that have no corresponding permission entries and should be excluded entirely
const EXCLUDED_DIRS = ['home', 'login', 'me'];

const USE_PERMISSION_PATH = path.resolve(
  __dirname,
  '../packages/ui/src/hooks/usePermission.ts',
);

function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

/**
 * Parse usePermission.ts and build the valid accessor path set
 * by traversing the `permissions` object literal structure.
 *
 * Strategy:
 * 1. Find the `export const permissions = { ... } as const;` block.
 * 2. Walk the nested object literal keys, resolving spread variables
 *    (e.g. `...admin`, `system: admin_system`) to their named const objects.
 * 3. Register every traversable dot-path as valid.
 */
function parseValidPermPaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // --- Step 1: collect all named const objects ---
  // Match `export const <name> = { ... } as const;`
  // We parse top-level blocks by counting braces.
  const namedConsts = {}; // name -> Set<key>

  const constRe = /export const (\w+)\s*=\s*\{/g;
  let m;
  while ((m = constRe.exec(content)) !== null) {
    const name = m[1];
    const startIdx = m.index + m[0].length - 1; // position of opening `{`
    const block = extractBlock(content, startIdx);
    if (block) {
      namedConsts[name] = extractTopLevelKeys(block);
    }
  }

  // --- Step 2: build the permissions tree ---
  // Find the `export const permissions = { ... } as const;` block
  const permMatch = /export const permissions\s*=\s*\{/.exec(content);
  if (!permMatch) return new Set();

  const permBlock = extractBlock(content, permMatch.index + permMatch[0].length - 1);
  if (!permBlock) return new Set();

  const validPaths = new Set();

  function walk(block, prefix, namedConsts) {
    const topKeys = extractTopLevelKeysWithValues(block);
    for (const { key, value, isSpread } of topKeys) {
      if (isSpread) {
        // e.g. `...admin` — spread the keys from the named const but don't add them as sub-paths
        // The spread makes its keys appear at the current level, but we only need to know
        // the current prefix is valid (already registered by caller)
        continue;
      }
      const fullPath = prefix ? `${prefix}.${key}` : key;
      validPaths.add(fullPath);

      // Resolve value: could be an inline `{ ... }` block or a reference to a named const
      if (value && value.startsWith('{')) {
        // Inline object
        walk(value, fullPath, namedConsts);
      } else if (value && namedConsts[value]) {
        // Named const reference
        walkNamedConst(value, fullPath, namedConsts);
      }
    }
  }

  function walkNamedConst(constName, prefix, namedConsts) {
    const keys = namedConsts[constName];
    if (!keys) return;

    // We need the actual block for this const to recurse into nested objects
    const re = new RegExp(`export const ${constName}\\s*=\\s*\\{`);
    const m2 = re.exec(content);
    if (!m2) return;
    const block = extractBlock(content, m2.index + m2[0].length - 1);
    if (!block) return;

    walk(block, prefix, namedConsts);
  }

  walk(permBlock, '', namedConsts);

  return validPaths;
}

/**
 * Extract a balanced brace block starting at `startIdx` (which points to the `{`).
 * Returns the content including the outer braces.
 */
function extractBlock(content, startIdx) {
  let depth = 0;
  let i = startIdx;
  let start = -1;
  while (i < content.length) {
    if (content[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
    i++;
  }
  return null;
}

/**
 * Extract top-level keys from an object block (handles nested braces).
 * Returns a Set of key strings.
 */
function extractTopLevelKeys(block) {
  const keys = new Set();
  // Strip outer braces
  const inner = block.slice(1, -1);
  const keyRe = /^\s*(?:\.\.\.(\w+)|(?:\/\*.*?\*\/\s*)*(['"]?)(\w+)\2\s*:)/gm;
  let m;
  while ((m = keyRe.exec(inner)) !== null) {
    if (m[1]) {
      keys.add(`...${m[1]}`);
    } else if (m[3]) {
      keys.add(m[3]);
    }
  }
  return keys;
}

/**
 * Extract top-level key-value pairs from an object block.
 * Returns array of { key, value, isSpread }.
 * value is either the reference name or the raw inline block string.
 */
function extractTopLevelKeysWithValues(block) {
  const inner = block.slice(1, -1);
  const result = [];
  let i = 0;

  while (i < inner.length) {
    // Skip whitespace and comments
    if (inner[i] === '/' && inner[i + 1] === '*') {
      const end = inner.indexOf('*/', i + 2);
      i = end >= 0 ? end + 2 : inner.length;
      continue;
    }
    if (inner[i] === '/' && inner[i + 1] === '/') {
      const end = inner.indexOf('\n', i + 2);
      i = end >= 0 ? end + 1 : inner.length;
      continue;
    }

    // Spread: `...name`
    if (inner[i] === '.' && inner[i + 1] === '.' && inner[i + 2] === '.') {
      const m = /\.\.\.(\w+)/.exec(inner.slice(i));
      if (m) {
        result.push({ key: m[1], value: null, isSpread: true });
        i += m[0].length;
      } else {
        i++;
      }
      continue;
    }

    // Key: `key:` or `'key':` or `"key":`
    const keyMatch = /^(['"]?)(\w+)\1\s*:/.exec(inner.slice(i));
    if (keyMatch) {
      const key = keyMatch[2];
      i += keyMatch[0].length;

      // Skip whitespace
      while (i < inner.length && /\s/.test(inner[i])) i++;

      // Value: object literal or identifier (possibly followed by comma/newline)
      if (inner[i] === '{') {
        const block2 = extractBlock(inner, i);
        result.push({ key, value: block2, isSpread: false });
        i += block2.length;
      } else {
        // Identifier (e.g. `admin_system`, `organization`)
        const identMatch = /^(\w+)/.exec(inner.slice(i));
        if (identMatch) {
          result.push({ key, value: identMatch[1], isSpread: false });
          i += identMatch[1].length;
        } else {
          // String or other primitive — skip to next comma
          const end = inner.indexOf(',', i);
          i = end >= 0 ? end + 1 : inner.length;
        }
      }
      continue;
    }

    i++;
  }

  return result;
}

const validPermPaths = parseValidPermPaths(USE_PERMISSION_PATH);

function generateConstantFile(dirPath, targetDir) {
  const rel = path.relative(targetDir, dirPath);
  if (!rel) return;
  const parts = rel.split(path.sep);

  const appMatch = targetDir.match(/apps[\\/]([^\\/]+)[\\/]src[\\/]pages/);
  const appName = appMatch ? appMatch[1] : '';
  if (!appName) return;

  const cleanParts = parts.map(toSnakeCase);

  // If the first folder matches the app name (e.g. pages/personal/profile → strip "personal")
  if (cleanParts[0] === toSnakeCase(appName)) {
    cleanParts.shift();
  }

  // Intermediate directory with no remaining keys → delete and skip
  if (cleanParts.length === 0) {
    const constantPath = path.join(dirPath, 'constant.ts');
    if (fs.existsSync(constantPath)) {
      fs.unlinkSync(constantPath);
      console.log(`[Deleted Excluded] ${constantPath}`);
    }
    return;
  }

  const permPath = [toSnakeCase(appName), ...cleanParts].join('.');

  let prefixDefinitions = `export const PREFIX_LV1 = '${toSnakeCase(appName)}' as const;\n`;
  for (let i = 0; i < cleanParts.length; i++) {
    prefixDefinitions += `export const PREFIX_LV${i + 2} = '${cleanParts[i]}' as const;\n`;
  }

  let content;
  if (validPermPaths.has(permPath)) {
    const imports = `import { permissions } from '@/hooks/usePermission';\n`;
    const thisPermissionStr = `permissions.${permPath}`;
    content = `${imports}
${prefixDefinitions}export const FULL_PREFIX = '${permPath}' as const;
export const THIS_PERMISSION = ${thisPermissionStr};
`;
    console.log(`[Generated] ${path.join(dirPath, 'constant.ts')}`);
  } else {
    // No corresponding permission entry: only export prefix constants, no THIS_PERMISSION
    content = `
${prefixDefinitions}export const FULL_PREFIX = '${permPath}' as const;
`;
    console.log(`[Generated (no perm)] ${path.join(dirPath, 'constant.ts')}`);
  }

  fs.writeFileSync(path.join(dirPath, 'constant.ts'), content, 'utf8');
}

function traverse(dirPath, targetDir) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'components') continue;

    const subPath = path.join(dirPath, entry.name);

    if (EXCLUDED_DIRS.includes(entry.name)) {
      const constantPath = path.join(subPath, 'constant.ts');
      if (fs.existsSync(constantPath)) {
        fs.unlinkSync(constantPath);
        console.log(`[Deleted Excluded] ${constantPath}`);
      }
      continue;
    }

    generateConstantFile(subPath, targetDir);
    traverse(subPath, targetDir);
  }
}

function generateRootConstant(targetDir) {
  const match = targetDir.match(/apps[\\/]([^\\/]+)[\\/]src[\\/]pages/);
  const appName = match ? match[1] : '';
  if (!appName) return;

  const rootConstantPath = path.join(targetDir, 'constant.ts');
  const permPath = toSnakeCase(appName);
  const hasPermission = validPermPaths.has(permPath);

  const content = hasPermission
    ? `/** 命名空间前缀 */
import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = '${appName}' as const;
export const THIS_PERMISSION = permissions[PREFIX_LV1];
`
    : `/** 命名空间前缀 */
export const PREFIX_LV1 = '${appName}' as const;
`;

  fs.writeFileSync(rootConstantPath, content, 'utf8');
  console.log(`[Generated Root] ${rootConstantPath}`);
}

console.log('Starting constant.ts generation for all apps...');
console.log(`Valid permission paths parsed: ${validPermPaths.size}`);
console.log('Sample paths:', [...validPermPaths].slice(0, 10).join(', '));

for (const targetDir of TARGET_DIRS) {
  if (fs.existsSync(targetDir)) {
    console.log(`\nProcessing target: ${targetDir}`);
    generateRootConstant(targetDir);
    traverse(targetDir, targetDir);
  }
}
console.log('\nFinished all.');
