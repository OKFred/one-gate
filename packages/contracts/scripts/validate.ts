import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { validate, type Schema } from '@cfworker/json-schema';
import { resolveResourceMeta } from '../src/defaults.js';
import type { CrudResourceContract } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PKG_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PKG_ROOT, '../..');
const RESOURCES_DIR = path.join(PKG_ROOT, 'src', 'resources');
const SCHEMA_PATH = path.join(PKG_ROOT, 'schema', 'crud-resource.schema.json');

const PERMISSIONS_TS_PATH = path.join(
  REPO_ROOT,
  'server/packages/core/src/constants/permissions.ts',
);
const OPENAPI_DTS_PATH = path.join(REPO_ROOT, 'platform/packages/ui/src/types/openapi.d.ts');
const UI_LOCALES_DIR = path.join(REPO_ROOT, 'platform/packages/ui/src/locales');

function collectJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results.sort();
}

function collectValidPermissionCodes(): Set<string> | null {
  if (!fs.existsSync(PERMISSIONS_TS_PATH)) return null;
  const content = fs.readFileSync(PERMISSIONS_TS_PATH, 'utf8');
  const sourceFile = ts.createSourceFile('permissions.ts', content, ts.ScriptTarget.Latest, true);
  let seedsNode: ts.ObjectLiteralExpression | null = null;

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'permissionSeeds'
    ) {
      let init = node.initializer;
      while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))) {
        init = init.expression;
      }
      if (init && ts.isObjectLiteralExpression(init)) {
        seedsNode = init;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  const codes = new Set<string>();
  if (!seedsNode) return codes;

  function walk(obj: ts.ObjectLiteralExpression, prefix: string): void {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : null;
      if (key === null) continue;
      const fullKey = key === '' ? prefix : prefix ? `${prefix}.${key}` : key;
      if (ts.isArrayLiteralExpression(prop.initializer)) {
        for (const el of prop.initializer.elements) {
          if (ts.isStringLiteral(el)) {
            codes.add(`${fullKey}:${el.text}`);
          }
        }
      } else if (ts.isObjectLiteralExpression(prop.initializer)) {
        walk(prop.initializer, fullKey);
      }
    }
  }
  walk(seedsNode, '');
  return codes;
}

function collectOpenApiPaths(): Set<string> | null {
  if (!fs.existsSync(OPENAPI_DTS_PATH)) return null;
  const content = fs.readFileSync(OPENAPI_DTS_PATH, 'utf8');
  const paths = new Set<string>();
  const pathRegex = /^\s{4}"(\/api\/[^"]+)":\s*\{/gm;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(content)) !== null) {
    paths.add(match[1]);
  }
  return paths;
}

async function loadLocaleKeys(
  baseDir: string,
  lang: 'zh-CN' | 'en-US',
): Promise<Set<string> | null> {
  const indexPath = path.join(baseDir, lang, 'index.ts');
  if (!fs.existsSync(indexPath)) return null;
  const mod = (await import(pathToFileURL(indexPath).href)) as {
    default?: Record<string, string>;
  };
  return new Set(Object.keys(mod.default ?? {}));
}

const I18N_STRING_KEYS = new Set([
  'titleKey',
  'labelKey',
  'placeholderKey',
  'helperTextKey',
  'fallbackKey',
  'trueLabelKey',
  'falseLabelKey',
  'confirmMessageKey',
  'successMessageKey',
  'errorMessageKey',
]);

function collectI18nKeysFromContract(obj: unknown, out: Set<string>): void {
  if (Array.isArray(obj)) {
    for (const item of obj) collectI18nKeysFromContract(item, out);
    return;
  }
  if (!obj || typeof obj !== 'object') return;

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === 'sortFieldLabelKeys' && v && typeof v === 'object') {
      for (const val of Object.values(v as Record<string, unknown>)) {
        if (typeof val === 'string' && val.length > 0) out.add(val);
      }
      continue;
    }
    if (I18N_STRING_KEYS.has(k) && typeof v === 'string' && v.length > 0) {
      out.add(v);
    } else if (v && typeof v === 'object') {
      collectI18nKeysFromContract(v, out);
    }
  }
}

function collectEndpointsFromContract(contract: CrudResourceContract): string[] {
  const meta = resolveResourceMeta(contract);
  const urls = new Set<string>();
  const addIfApi = (u?: string) => {
    if (u && u.startsWith('/api/')) urls.add(u);
  };

  addIfApi(meta.endpoints.list);
  addIfApi(meta.endpoints.listAll);
  addIfApi(meta.endpoints.get);
  addIfApi(meta.endpoints.add);
  addIfApi(meta.endpoints.update);
  addIfApi(meta.endpoints.delete);
  addIfApi(meta.endpoints.deleteWithUndo);
  addIfApi(meta.endpoints.detail);

  for (const act of contract.actions ?? []) {
    if (act.type === 'api') addIfApi(act.url);
  }
  if (contract.detailDialog?.fetchUrl) {
    addIfApi(contract.detailDialog.fetchUrl);
  }
  for (const field of contract.fields) {
    if (field.ui?.form) {
      if (field.ui.form.optionsSource?.url) addIfApi(field.ui.form.optionsSource.url);
      if (field.ui.form.dynamicSubForm?.schemaUrl) addIfApi(field.ui.form.dynamicSubForm.schemaUrl);
    }
  }
  return [...urls];
}

function collectRegexPatterns(
  obj: unknown,
  pathPrefix: string,
  out: Array<{ location: string; pattern: string }>,
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => collectRegexPatterns(item, `${pathPrefix}[${idx}]`, out));
    return;
  }
  if (!obj || typeof obj !== 'object') return;

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const nextPath = pathPrefix ? `${pathPrefix}.${k}` : k;
    if (k === 'pattern' && typeof v === 'string') {
      out.push({ location: nextPath, pattern: v });
    } else if (v && typeof v === 'object') {
      collectRegexPatterns(v, nextPath, out);
    }
  }
}

async function main(): Promise<void> {
  const metaSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')) as Schema;
  const jsonFiles = collectJsonFiles(RESOURCES_DIR);
  const validPerms = collectValidPermissionCodes();
  const openApiPaths = collectOpenApiPaths();

  const uiZh = await loadLocaleKeys(UI_LOCALES_DIR, 'zh-CN');
  const uiEn = await loadLocaleKeys(UI_LOCALES_DIR, 'en-US');

  const appLocaleCache = new Map<string, { zh: Set<string>; en: Set<string> }>();
  const getAppLocales = async (app: string) => {
    const cached = appLocaleCache.get(app);
    if (cached) return cached;
    const appLocDir = path.join(REPO_ROOT, 'platform/apps', app, 'src/locales');
    const zh = (await loadLocaleKeys(appLocDir, 'zh-CN')) ?? new Set<string>();
    const en = (await loadLocaleKeys(appLocDir, 'en-US')) ?? new Set<string>();
    const entry = { zh, en };
    appLocaleCache.set(app, entry);
    return entry;
  };

  const errors: string[] = [];

  for (const filePath of jsonFiles) {
    const rel = path.relative(PKG_ROOT, filePath).split(path.sep).join('/');
    const contract = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CrudResourceContract;

    // 1. 元 Schema 校验
    const validation = validate(contract, metaSchema, '2020-12');
    if (!validation.valid) {
      for (const err of validation.errors) {
        errors.push(`[${rel}] Schema: ${err.instanceLocation || '/'}: ${err.error}`);
      }
      continue;
    }

    const meta = resolveResourceMeta(contract);

    // 2. 权限码白名单校验
    if (validPerms) {
      const permCodesToCheck: string[] = [
        ...meta.permissions.add,
        ...meta.permissions.edit,
        ...meta.permissions.delete,
        ...(contract.softDelete?.recycleBinPermissions ?? []),
        ...(contract.softDelete?.verifyReadPermissions ?? []),
      ];
      for (const act of contract.actions ?? []) {
        permCodesToCheck.push(...(act.permissionCodes ?? []));
      }
      for (const code of permCodesToCheck) {
        if (!validPerms.has(code)) {
          errors.push(`[${rel}] Unknown permission code "${code}"`);
        }
      }
    }

    // 3. OpenAPI 路径校验
    if (openApiPaths) {
      for (const endpoint of collectEndpointsFromContract(contract)) {
        if (!openApiPaths.has(endpoint)) {
          errors.push(`[${rel}] Endpoint "${endpoint}" not found in openapi.d.ts`);
        }
      }
    }

    // 4. i18n 文案双语对齐校验
    if (uiZh && uiEn) {
      const appLocales = await getAppLocales(meta.app);
      const keys = new Set<string>();
      collectI18nKeysFromContract(contract, keys);
      // 同时检查预设字段引入的通用 key
      keys.add('common.saveSuccess');
      keys.add('common.deleteSuccess');
      for (const key of keys) {
        const hasZh = uiZh.has(key) || appLocales.zh.has(key);
        const hasEn = uiEn.has(key) || appLocales.en.has(key);
        if (!hasZh) errors.push(`[${rel}] Missing zh-CN i18n key "${key}"`);
        if (!hasEn) errors.push(`[${rel}] Missing en-US i18n key "${key}"`);
      }
    }

    // 5. 正则表达式（含浏览器 HTML pattern /v 模式）兼容性校验
    const patterns: Array<{ location: string; pattern: string }> = [];
    collectRegexPatterns(contract, '', patterns);
    for (const { location, pattern } of patterns) {
      for (const flags of ['', 'v'] as const) {
        try {
          new RegExp(pattern, flags);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(
            `[${rel}] Invalid regex at "${location}" (flags="${flags || 'default'}"): ${msg}`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`❌ Contract validation failed (${errors.length} issue(s)):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }

  console.log(`✅ Validated ${jsonFiles.length} contract(s): schema, permissions, OpenAPI, and zh-CN/en-US i18n all OK.`);
}

await main();
