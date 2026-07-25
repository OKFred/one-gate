#!/usr/bin/env node

/**
 * 本地多语言字典 Key 与语言包完全对齐检查脚本
 *
 * 规则：
 * 1. 规定必需语言包：zh-CN 和 en-US。
 * 2. 任何 locales 目录下若缺失其中一种语言子目录（例如只有 zh-CN 缺失 en-US），即判定为异常整改项。
 * 3. 任何模块 TS 文件（如 system.ts）在一种语言下存在，在另一种语言下也必须存在。
 * 4. 两边同名模块 TS 文件中的 Key 必须双向完备对齐。
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PLATFORM_DIR = resolve(__dirname, '..');
const REQUIRED_LANGUAGES = ['zh-CN', 'en-US'];

// 命令行参数判断
const args = process.argv.slice(2);
const FAIL_ON_MISSING = args.includes('--fail-on-missing');

/**
 * 从 TS 语言包文件中解析提取 key 集合
 */
function extractKeysFromTsFile(filePath) {
  if (!existsSync(filePath)) return new Set();
  const content = readFileSync(filePath, 'utf-8');
  const keys = new Set();

  // 匹配 'key.name': 或 "key.name": 结构的键名
  const keyRegex = /['"]([a-zA-Z0-9_.\-]+)['"]\s*:/g;
  let match;
  while ((match = keyRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

/**
 * 递归查找给定目录下所有的 locales 文件夹
 */
function findLocaleDirs(rootDir, results = []) {
  if (!existsSync(rootDir)) return results;
  const items = readdirSync(rootDir);

  for (const item of items) {
    const fullPath = join(rootDir, item);
    if (item === 'node_modules' || item.startsWith('.')) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (item === 'locales') {
        results.push(fullPath);
      } else {
        findLocaleDirs(fullPath, results);
      }
    }
  }
  return results;
}

function runCheck() {
  console.log('🌐 正在检查本地多语言字典 (locales) 完整性与跨语言对齐情况...\n');
  console.log(`必须支持的语言包清单: \x1b[36m${REQUIRED_LANGUAGES.join(', ')}\x1b[0m\n`);

  const localeDirs = findLocaleDirs(PLATFORM_DIR);
  let totalIssueCount = 0;

  for (const localeDir of localeDirs) {
    const relLocalePath = join(localeDir.replace(PLATFORM_DIR, '')).replace(/^[\\\/]/, '');
    console.log(`📁 检查 locales 目录: \x1b[36m${relLocalePath}\x1b[0m`);

    const existingSubItems = readdirSync(localeDir);
    const existingLangs = existingSubItems.filter((item) => {
      const p = join(localeDir, item);
      return statSync(p).isDirectory() && !item.startsWith('.');
    });

    // 1. 校验必需语言包目录是否齐全
    const missingLangs = REQUIRED_LANGUAGES.filter((lang) => !existingLangs.includes(lang));
    if (missingLangs.length > 0) {
      for (const missingLang of missingLangs) {
        totalIssueCount++;
        console.log(
          `  \x1b[31m❌ [目录结构缺失] 该 locales 目录缺少语言包文件夹: \x1b[33m${missingLang}\x1b[0m`,
        );
      }
    }

    // 收集所有已存在的模块 ts 文件（排除 index.ts）
    const langFilesMap = {}; // { 'zh-CN': Set(['common.ts', ...]), 'en-US': Set([...]) }
    const allModuleFiles = new Set();

    for (const lang of REQUIRED_LANGUAGES) {
      const langDir = join(localeDir, lang);
      if (existsSync(langDir)) {
        const files = readdirSync(langDir).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
        langFilesMap[lang] = new Set(files);
        files.forEach((f) => allModuleFiles.add(f));
      } else {
        langFilesMap[lang] = new Set();
      }
    }

    // 2. 校验模块文件是否在每种语言中均存在
    for (const modFile of allModuleFiles) {
      for (const lang of REQUIRED_LANGUAGES) {
        const modFilePath = join(localeDir, lang, modFile);
        if (!existsSync(modFilePath)) {
          totalIssueCount++;
          console.log(
            `  \x1b[31m❌ [模块文件缺失] \x1b[33m${lang}/${modFile}\x1b[31m 模块文件不存在\x1b[0m`,
          );
        }
      }
    }

    // 3. 对齐校验双向 Key
    for (const modFile of allModuleFiles) {
      const langA = REQUIRED_LANGUAGES[0]; // 'zh-CN'
      const langB = REQUIRED_LANGUAGES[1]; // 'en-US'

      const fileA = join(localeDir, langA, modFile);
      const fileB = join(localeDir, langB, modFile);

      if (existsSync(fileA) && existsSync(fileB)) {
        const keysA = extractKeysFromTsFile(fileA);
        const keysB = extractKeysFromTsFile(fileB);

        const missingInB = [...keysA].filter((k) => !keysB.has(k));
        const missingInA = [...keysB].filter((k) => !keysA.has(k));

        if (missingInB.length > 0) {
          totalIssueCount += missingInB.length;
          console.log(
            `  \x1b[31m❌ [Key 缺失] [${modFile}] \x1b[33m${langB}\x1b[31m 缺失 ${missingInB.length} 个 \x1b[36m${langA}\x1b[31m 中定义的 Key:\x1b[0m`,
          );
          missingInB.forEach((k) => console.log(`      - \x1b[33m${k}\x1b[0m`));
        }

        if (missingInA.length > 0) {
          totalIssueCount += missingInA.length;
          console.log(
            `  \x1b[31m❌ [Key 缺失] [${modFile}] \x1b[33m${langA}\x1b[31m 缺失 ${missingInA.length} 个 \x1b[36m${langB}\x1b[31m 中定义的 Key:\x1b[0m`,
          );
          missingInA.forEach((k) => console.log(`      - \x1b[33m${k}\x1b[0m`));
        }
      }
    }
    console.log('');
  }

  console.log('----------------------------------------');
  if (totalIssueCount === 0) {
    console.log('✅ 所有 locales 语言目录与文案 Key 完全符合规范，未发现任何缺失！');
    process.exit(0);
  } else {
    console.log(
      `⚠️  共检测到 \x1b[31m${totalIssueCount}\x1b[0m 处语言包目录缺失、模块缺失或 Key 未对齐！`,
    );
    if (FAIL_ON_MISSING) {
      console.log('❌ 已开启 --fail-on-missing 模式，阻止 Git 提交。请修正上述不合规项。');
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runCheck();
