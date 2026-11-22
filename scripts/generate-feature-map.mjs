import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'docs/feature-map.md');
const META_PATH = path.join(REPO_ROOT, 'docs/feature-map.meta.json');

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function walkFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', '.wrangler', '.vitest', 'generated'].includes(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, acc);
    } else if (predicate(full, entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function loadZhDict() {
  const dict = {};
  const dirs = [
    'platform/packages/ui/src/locales/zh-CN',
    'platform/apps/admin/src/locales/zh-CN',
    'platform/apps/enterprise/src/locales/zh-CN',
    'platform/apps/personal/src/locales/zh-CN',
  ];
  const pairRe = /['"`]([^'"`]+)['"`]\s*:\s*\n?\s*['"`]([^'"`]*)['"`]/g;
  for (const dir of dirs) {
    const absDir = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const file of fs.readdirSync(absDir).sort()) {
      if (!file.endsWith('.ts')) continue;
      const content = fs.readFileSync(path.join(absDir, file), 'utf8');
      pairRe.lastIndex = 0;
      let m;
      while ((m = pairRe.exec(content)) !== null) {
        dict[m[1]] = m[2];
      }
    }
  }
  return dict;
}

function parseMenuMap(zhDict) {
  const menuPath = path.join(REPO_ROOT, 'server/packages/core/src/db/initMenu.ts');
  const txt = fs.readFileSync(menuPath, 'utf8');
  const arrMatch = txt.match(/export const initialMenuData = \[([\s\S]*?)\];/);
  if (!arrMatch) {
    throw new Error('Cannot find initialMenuData array in server/packages/core/src/db/initMenu.ts');
  }

  const blockRe = /\{([^{}]+)\}/g;
  const nodes = [];
  let bm;
  while ((bm = blockRe.exec(arrMatch[1])) !== null) {
    const body = bm[1];
    const idM = body.match(/\bid:\s*(\d+)/);
    const nameM = body.match(/\bname:\s*"([^"]+)"/);
    const pathM = body.match(/\bpath:\s*"([^"]+)"/);
    const pidM = body.match(/\bparentId:\s*(\d+)/);
    if (!idM || !nameM) continue;
    nodes.push({
      id: Number(idM[1]),
      label: zhDict[nameM[1]] || nameM[1],
      path: pathM ? pathM[1] : null,
      parentId: pidM ? Number(pidM[1]) : null,
    });
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byRoute = new Map();
  for (const node of nodes) {
    if (!node.path) continue;
    const parts = [];
    let cur = node;
    while (cur) {
      parts.unshift(cur.label);
      cur = cur.parentId ? byId.get(cur.parentId) : null;
    }
    byRoute.set(node.path, parts.join(' / '));
  }
  return byRoute;
}

function loadContracts() {
  const resRoot = path.join(REPO_ROOT, 'packages/contracts/src/resources');
  const files = walkFiles(resRoot, (_, name) => name.endsWith('.json')).sort();
  return files.map((absPath) => {
    const rel = toPosix(path.relative(REPO_ROOT, absPath));
    const json = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const app = json.app || json.resource.split('/')[0];
    const rawRoute = json.route || json.resource;
    const fullRoute = '/' + (rawRoute.startsWith(`${app}/`) ? rawRoute : `${app}/${rawRoute}`);
    return {
      rel,
      resource: json.resource,
      app,
      route: fullRoute,
      mountRoute: json.mountRoute !== false,
      embedded: Boolean(json.embedded),
      readonly: Boolean(json.readonly),
    };
  });
}

function loadPhysicalPages() {
  const entries = [];
  const adminRootExceptions = new Set(['home', 'me', 'calendar']);
  for (const app of ['admin', 'enterprise', 'personal']) {
    const pagesRoot = path.join(REPO_ROOT, 'platform/apps', app, 'src/pages');
    const files = walkFiles(pagesRoot, (_, name) => name === 'index.tsx').sort();
    for (const absPath of files) {
      const rel = toPosix(path.relative(REPO_ROOT, absPath));
      const subDir = toPosix(path.relative(pagesRoot, path.dirname(absPath)));
      if (app === 'admin') {
        if (subDir === 'error' || subDir.startsWith('error/')) continue;
      } else if (
        subDir === 'error' ||
        subDir.startsWith('error/') ||
        subDir === 'login' ||
        subDir.startsWith('login/')
      ) {
        continue;
      }
      let route;
      if (app === 'admin' && subDir === 'sso-callback') {
        route = '/sso/callback';
      } else if (app === 'admin' && subDir === 'login') {
        route = '/login';
      } else if (app === 'admin' && adminRootExceptions.has(subDir)) {
        route = `/${subDir}`;
      } else {
        route = `/${app}/${subDir}`;
      }
      const txt = fs.readFileSync(absPath, 'utf8');
      entries.push({
        app,
        route,
        rel,
        usesContractCrud: txt.includes('ContractCrudPage'),
      });
    }
  }
  return entries;
}

function collectE2ECoverage(meta) {
  const e2eRoot = path.join(REPO_ROOT, 'platform/e2e');
  const specs = walkFiles(e2eRoot, (_, name) => name.endsWith('.spec.ts')).sort();
  const routeToSpecs = new Map();
  const specInfos = [];

  const addMatch = (route, specRel) => {
    if (!routeToSpecs.has(route)) routeToSpecs.set(route, new Set());
    routeToSpecs.get(route).add(specRel);
  };

  for (const absPath of specs) {
    const specRel = toPosix(path.relative(REPO_ROOT, absPath));
    const txt = fs.readFileSync(absPath, 'utf8');
    const matched = new Set(meta.specRouteHints?.[specRel] ?? []);
    const hashRe = /['"`][^'"`]*#(\/[a-zA-Z0-9_/-]+)(?:\?[^'"`]*)?['"`]/g;
    let m;
    while ((m = hashRe.exec(txt)) !== null) {
      matched.add(m[1]);
    }
    const routes = [...matched].sort();
    for (const r of routes) {
      addMatch(r, specRel);
    }
    const mode = txt.includes('mockAuth') ? 'Mock 隔离' : '单测 / 实机';
    specInfos.push({ specRel, mode, routes });
  }

  return { routeToSpecs, specInfos };
}

function formatMd() {
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  const zhDict = loadZhDict();
  const menuByRoute = parseMenuMap(zhDict);
  const contracts = loadContracts();
  const physicalPages = loadPhysicalPages();
  const { routeToSpecs, specInfos } = collectE2ECoverage(meta);

  const contractByRoute = new Map();
  const embeddedContracts = [];
  for (const c of contracts) {
    if (!c.mountRoute) {
      embeddedContracts.push(c);
    } else {
      contractByRoute.set(c.route, c);
    }
  }

  const physicalByRoute = new Map(physicalPages.map((p) => [p.route, p]));
  const allRoutes = new Set([...contractByRoute.keys(), ...physicalByRoute.keys()]);

  const records = [...allRoutes]
    .sort()
    .map((route) => {
      const c = contractByRoute.get(route);
      const p = physicalByRoute.get(route);
      const app = p?.app ?? c?.app ?? 'admin';
      const menuLabel = menuByRoute.get(route) || meta.routeLabels?.[route] || '-';

      let mode;
      const sources = [];
      if (c && p) {
        mode = p.usesContractCrud
          ? c.readonly
            ? '契约只读 + 扩展壳'
            : '契约扩展页 (`ContractCrudPage`)'
          : '物理页覆盖契约';
        sources.push(`\`${c.rel}\``, `\`${p.rel}\``);
      } else if (c) {
        mode = c.readonly ? '纯 JSON 契约（只读）' : '纯 JSON 契约（零 TSX）';
        sources.push(`\`${c.rel}\``);
      } else {
        mode = '自定义业务页';
        sources.push(`\`${p.rel}\``);
      }

      const specs = [...(routeToSpecs.get(route) ?? [])]
        .sort()
        .map((s) => `\`${path.posix.basename(s)}\``);

      return {
        app,
        route,
        menuLabel,
        mode,
        sources: sources.join(' + '),
        e2e: specs.length > 0 ? specs.join(', ') : '-',
      };
    });

  const pureJsonCount = contracts.filter((c) => c.mountRoute && !physicalByRoute.has(c.route)).length;
  const extContractCount = physicalPages.filter((p) => p.usesContractCrud).length;
  const customPageCount = physicalPages.filter((p) => !p.usesContractCrud).length;

  const lines = [
    '# One Gate 功能地图 (Feature Map)',
    '',
    '> 本文档由 `node scripts/generate-feature-map.mjs` 从 `@hodor/contracts`、三端 `pages/**/index.tsx`、`initMenu.ts` 与 `platform/e2e/` 自动生成；请勿手工修改。更新路由或契约后请执行 `pnpm run feature-map:generate`（或 `pnpm run sync:all`）。',
    '',
    '## 全局规模概览',
    '',
    `- **可访问页面路由总计**：\`${records.length}\` 个（纯 JSON 契约 \`${pureJsonCount}\` + 契约扩展壳 \`${extContractCount}\` + 自定义业务页 \`${customPageCount}\`）`,
    `- **嵌入式契约总计**：\`${embeddedContracts.length}\` 份（挂载于 \`/admin/base/log\` 多 Tab，不单独注册路由）`,
    `- **Playwright E2E 套件总计**：\`${specInfos.length}\` 个`,
    '',
    '## 核心用户旅程 (Top Journeys)',
    '',
    '| 旅程名称 | 主入口 | 关键路径与模块联动 | E2E 覆盖 |',
    '| --- | --- | --- | --- |',
  ];

  for (const j of meta.journeys) {
    const e2eLinks = j.e2e.map((s) => `\`${path.posix.basename(s)}\``).join(', ');
    lines.push(`| ${j.name} | \`${j.entry}\` | ${j.flow} | ${e2eLinks} |`);
  }

  for (const [app, title] of [
    ['admin', '管理端与通用路由 (`@hodor/web-admin`)'],
    ['enterprise', '企业协作微前端 (`@hodor/web-enterprise`)'],
    ['personal', '个人中心微前端 (`@hodor/web-personal`)'],
  ]) {
    const group = records.filter((r) => r.app === app);
    lines.push('', `## ${title}（${group.length} 个路由）`, '');
    lines.push('| 路由 | 菜单 / 功能名 | 实现形态 | 源码 / 契约位置 | E2E 覆盖 |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of group) {
      lines.push(`| \`${r.route}\` | ${r.menuLabel} | ${r.mode} | ${r.sources} | ${r.e2e} |`);
    }
  }

  lines.push('', '## 嵌入式子契约 (`mountRoute: false`)', '');
  lines.push('| 资源名 | 宿主页面 | 实现形态 | 契约文件 |');
  lines.push('| --- | --- | --- | --- |');
  for (const c of embeddedContracts) {
    lines.push(
      `| \`${c.resource}\` | \`/admin/base/log\` | ${c.readonly ? '只读嵌入 Tab' : '嵌入 Tab'} | \`${c.rel}\` |`,
    );
  }

  lines.push('', '## E2E 测试套件索引 (`platform/e2e/`)', '');
  lines.push('| 测试文件 | 运行模式 | 覆盖路由 |');
  lines.push('| --- | --- | --- |');
  for (const s of specInfos) {
    const rText = s.routes.length > 0 ? s.routes.map((r) => `\`${r}\``).join(', ') : '纯逻辑单测 / API 层';
    lines.push(`| \`${s.specRel}\` | ${s.mode} | ${rText} |`);
  }

  lines.push('');
  return lines.join('\n');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const next = formatMd();

  if (checkOnly) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.error('❌ docs/feature-map.md is missing. Run "pnpm run feature-map:generate".');
      process.exit(1);
    }
    const current = fs.readFileSync(OUTPUT_PATH, 'utf8');
    if (current !== next) {
      console.error(
        '❌ docs/feature-map.md is out of date with contracts/pages/menus/E2E. Run "pnpm run feature-map:generate".',
      );
      process.exit(1);
    }
    console.log('✅ docs/feature-map.md is up to date.');
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, next, 'utf8');
  console.log('✅ Generated docs/feature-map.md');
}

main();
