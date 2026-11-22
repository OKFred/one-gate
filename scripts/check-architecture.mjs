import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.wrangler',
  '.vitest',
  'generated',
  'playwright-report',
  'test-results',
]);

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function walkFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, acc);
    } else {
      const rel = toPosix(path.relative(REPO_ROOT, full));
      if (predicate(rel, entry.name)) {
        acc.push({ full, rel });
      }
    }
  }
  return acc;
}

function isTestOrDts(rel) {
  return (
    rel.endsWith('.d.ts') ||
    rel.endsWith('.spec.ts') ||
    rel.endsWith('.spec.tsx') ||
    rel.endsWith('.test.ts') ||
    rel.endsWith('.test.tsx') ||
    rel.endsWith('.contract-tests.ts') ||
    rel.includes('/__test/') ||
    rel.startsWith('server/apps/server/test/') ||
    rel.startsWith('platform/e2e/')
  );
}

const ANY_SYNTAX_RE = /(?:\:\s*any\b|\bas\s+any\b|,\s*any\b|<any\b|\bany\[\])/g;

function countAnyInSource(content) {
  let count = 0;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }
    const matches = line.match(ANY_SYNTAX_RE);
    if (matches) count += matches.length;
  }
  return count;
}

function checkBackendCrossPackageImports(errors) {
  const pkgFiles = walkFiles(
    path.join(REPO_ROOT, 'server/packages'),
    (rel, name) =>
      name.endsWith('.ts') &&
      !isTestOrDts(rel) &&
      /^server\/packages\/(admin|enterprise|personal)\/src\//.test(rel),
  );
  const importRe = /from\s+["']@hodor\/(admin|enterprise|personal)(?:\/([^"']+))?["']/g;

  for (const { full, rel } of pkgFiles) {
    const selfMatch = rel.match(/^server\/packages\/(admin|enterprise|personal)\//);
    if (!selfMatch) continue;
    const selfPkg = selfMatch[1];
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      importRe.lastIndex = 0;
      let m;
      while ((m = importRe.exec(line)) !== null) {
        const targetPkg = m[1];
        const subPath = m[2] ?? '';
        if (targetPkg === selfPkg) continue;
        if (subPath === 'common/registry' || subPath === 'common/registry.js') continue;
        errors.push(
          `[cross-pkg-import] ${rel}:${idx + 1}: cross-package import "@hodor/${targetPkg}${subPath ? `/${subPath}` : ''}" must go through "@hodor/${targetPkg}/common/registry.js"`,
        );
      }
    });
  }
}

function checkDrizzleDefaults(errors) {
  const schemaFiles = walkFiles(
    path.join(REPO_ROOT, 'server'),
    (rel, name) =>
      !isTestOrDts(rel) &&
      (name === 'model.ts' || name === 'schema.ts' || name === 'schema.pg.ts'),
  );
  const nonTimestampDefaultRe = /\.default\((?!getCurrentTimestampUtcSql|pgTimestampUtcSql)/;

  for (const { full, rel } of schemaFiles) {
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (nonTimestampDefaultRe.test(line)) {
        errors.push(
          `[drizzle-default] ${rel}:${idx + 1}: non-timestamp .default(...) is prohibited in models/schemas`,
        );
      }
    });
  }
}

function checkPostOnlyEndpoints(errors) {
  const serviceFiles = walkFiles(
    path.join(REPO_ROOT, 'server/packages'),
    (rel, name) =>
      name === 'service.ts' &&
      !isTestOrDts(rel) &&
      /^server\/packages\/[^/]+\/src\//.test(rel),
  );
  const pathInfoMethodRe = /pathInfo\s*:\s*\{[^}]*\bmethod\s*:\s*["'`]([a-zA-Z]+)["'`]/gs;

  for (const { full, rel } of serviceFiles) {
    const content = fs.readFileSync(full, 'utf8');
    let m;
    while ((m = pathInfoMethodRe.exec(content)) !== null) {
      const method = m[1].toLowerCase();
      if (method !== 'post') {
        const lineNo = content.slice(0, m.index).split('\n').length;
        errors.push(
          `[post-only] ${rel}:${lineNo}: API endpoint method "${m[1]}" must be "post"`,
        );
      }
    }
  }
}

function checkFrontendRules(errors) {
  const frontendFiles = walkFiles(
    path.join(REPO_ROOT, 'platform'),
    (rel, name) =>
      /\.(ts|tsx)$/.test(name) &&
      !isTestOrDts(rel) &&
      (rel.startsWith('platform/apps/') || rel.startsWith('platform/packages/')),
  );
  const fallbackRe = /\bt\(\s*['"`][^'"`]+['"`]\s*(?:,\s*\{[^}]*\}\s*)?\)\s*\|\|\s*['"`]/;
  const toLocaleRe = /\bnew\s+Date\([^)]*\)\s*\.toLocale(?:Date|Time)?String\(/;

  for (const { full, rel } of frontendFiles) {
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      if (fallbackRe.test(line)) {
        errors.push(
          `[i18n-no-fallback] ${rel}:${idx + 1}: do not append fallback string literals to t()`,
        );
      }
      if (toLocaleRe.test(line)) {
        errors.push(
          `[dayjs-only] ${rel}:${idx + 1}: use dayjs(...) instead of new Date().toLocaleString()`,
        );
      }
    });
  }
}

function checkAnyRatchet(errors, notices) {
  const baselinePath = path.join(__dirname, 'any-ratchet-baseline.json');
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

  const sourceFiles = ['packages/contracts/src', 'platform', 'server'].flatMap((dir) =>
    walkFiles(path.join(REPO_ROOT, dir), (rel, name) => /\.(ts|tsx)$/.test(name) && !isTestOrDts(rel)),
  );
  const seen = new Set();

  for (const { full, rel } of sourceFiles) {
    seen.add(rel);
    const count = countAnyInSource(fs.readFileSync(full, 'utf8'));
    const maxAllowed = Object.hasOwn(baseline, rel) ? baseline[rel] : 0;

    if (count > maxAllowed) {
      errors.push(
        maxAllowed === 0
          ? `[any-ratchet] ${rel}: found ${count} explicit "any" usage(s); new/clean files must keep 0`
          : `[any-ratchet] ${rel}: found ${count} explicit "any" usage(s), exceeding ratchet baseline (${maxAllowed})`,
      );
    } else if (maxAllowed > 0 && count < maxAllowed) {
      notices.push(
        `[any-ratchet] ${rel} improved (${maxAllowed} -> ${count}); please tighten scripts/any-ratchet-baseline.json`,
      );
    }
  }

  for (const [rel, maxAllowed] of Object.entries(baseline)) {
    if (!seen.has(rel)) {
      notices.push(
        `[any-ratchet] ${rel} (baseline ${maxAllowed}) no longer exists; please remove from scripts/any-ratchet-baseline.json`,
      );
    }
  }
}

function checkRetiredArtifacts(errors) {
  const retiredPaths = ['platform/vite.config.ts'];
  for (const rel of retiredPaths) {
    if (fs.existsSync(path.join(REPO_ROOT, rel))) {
      errors.push(`[retired-artifact] ${rel} was retired after monorepo migration and must not exist`);
    }
  }
}

function main() {
  const errors = [];
  const notices = [];

  checkBackendCrossPackageImports(errors);
  checkDrizzleDefaults(errors);
  checkPostOnlyEndpoints(errors);
  checkFrontendRules(errors);
  checkAnyRatchet(errors, notices);
  checkRetiredArtifacts(errors);

  for (const notice of notices) {
    console.log(notice);
  }

  if (errors.length > 0) {
    console.error(`\n❌ Architecture & guardrail check failed (${errors.length} issue(s)):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }

  console.log('✅ Architecture guardrails passed (cross-pkg, Drizzle defaults, POST-only, i18n/dayjs, any ratchet, retired files).');
}

main();
