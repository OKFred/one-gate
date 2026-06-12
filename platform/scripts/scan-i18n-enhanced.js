#!/usr/bin/env node

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 扫描前端多语言使用情况的脚本（增强版）
 * 支持多种输出格式和详细分析
 */

const TRANSLATION_REGEX = /t\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

/**
 * 验证是否为有效的翻译键
 * 有效的翻译键必须符合: xxx.yyy 的模式（至少一个点，由字母数字和点组成）
 * 排除: 日期格式、路径、特殊字符等
 */
function isValidTranslationKey(key) {
  // 必须包含至少一个点
  if (!key.includes('.')) return false;

  // 排除日期格式 (YYYY-MM-DD 等)
  if (/\d{4}-\d{2}-\d{2}/.test(key)) return false;

  // 排除时间格式 (HH:mm:ss 等)
  if (/\d{2}:\d{2}/.test(key)) return false;

  // 排除路径 (包含 / 或 \\)
  if (/[\\\/]/.test(key)) return false;

  // 排除 URL 和 @alias
  if (/^[@]|^https?:/.test(key)) return false;

  // 排除只有特殊字符的（如单个 , 或 -）
  if (/^[,\-\s]+$/.test(key)) return false;

  // 必须以字母开头
  if (!/^[a-zA-Z]/.test(key)) return false;

  return true;
}

/**
 * 递归扫描目录获取所有 TSX/TS 文件
 */
function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.startsWith('.')) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 从文件中提取所有多语言键
 */
function extractTranslationKeys(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const keys = [];

    let match;
    TRANSLATION_REGEX.lastIndex = 0;

    while ((match = TRANSLATION_REGEX.exec(content)) !== null) {
      const key = match[1].trim();
      if (key && !key.includes('${') && isValidTranslationKey(key)) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        keys.push({
          key,
          line: lineNum,
          context: match[0],
        });
      }
    }

    return keys;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * 从 initTranslation.ts 文件中提取所有多语言键，支持解析并加载其 import 导入的所有子翻译文件
 */
function extractInitI18nKeys(filePath) {
  const keys = new Set();
  try {
    const content = readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+{[^}]+}\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    const serverSrcDir = path.dirname(path.dirname(filePath)); // server/src
    const dbDir = path.dirname(filePath); // server/src/db

    // 1. 提取 initTranslation.ts 中直接定义的所有 tKey
    const directKeyRegex = /tKey:\s*['"`]([^'"`]+)['"`]/g;
    let directMatch;
    while ((directMatch = directKeyRegex.exec(content)) !== null) {
      keys.add(directMatch[1].trim());
    }

    // 2. 解析所有 import 的多语言配置文件并提取 tKey
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      let resolvedPath;
      if (importPath.startsWith('@/')) {
        resolvedPath = join(serverSrcDir, importPath.slice(2));
      } else if (importPath.startsWith('./')) {
        resolvedPath = join(dbDir, importPath);
      } else {
        continue;
      }

      // 自动拼接扩展名
      if (!resolvedPath.endsWith('.ts')) {
        resolvedPath += '.ts';
      }

      try {
        const fileContent = readFileSync(resolvedPath, 'utf-8');
        const keyRegex = /tKey:\s*['"`]([^'"`]+)['"`]/g;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(fileContent)) !== null) {
          keys.add(keyMatch[1].trim());
        }
      } catch (err) {
        console.error(
          `Warning: Failed to read imported translation file ${resolvedPath}:`,
          err.message,
        );
      }
    }

    return keys;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return new Set();
  }
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport(missingKeys, unusedKeys, keyLocations, title) {
  let report = `# ${title}\n\n`;
  report += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

  const usedKeysCount = Object.keys(keyLocations).length;
  const definedKeysCount = usedKeysCount - missingKeys.length + unusedKeys.length;

  report += `## 统计摘要\n\n`;
  report += `- 前端代码中使用的多语言键数：${usedKeysCount}\n`;
  report += `- 数据库中定义的多语言键数：${definedKeysCount}\n`;
  report += `- **缺失的多语言键数：${missingKeys.length}**\n`;
  report += `- **未使用的多语言键数：${unusedKeys.length}**\n\n`;

  if (missingKeys.length > 0) {
    report += `## 缺失的多语言键（${missingKeys.length}个）\n\n`;
    report += `以下是前端代码中使用但未在 initTranslation.ts 中定义的多语言键：\n\n`;

    missingKeys.forEach((key) => {
      const locations = keyLocations[key] || [];
      report += `### \`${key}\`\n\n`;
      report += `**使用次数**：${locations.length}\n\n`;
      report += `**使用位置**：\n`;
      locations.forEach((loc) => {
        report += `- ${loc.file}:${loc.line} - \`${loc.context}\`\n`;
      });
      report += `\n`;
    });
  }

  if (unusedKeys.length > 0) {
    report += `## 已定义但未使用的多语言键（${unusedKeys.length}个）\n\n`;
    report += `以下是在 initTranslation.ts 中定义但前端代码中未使用的多语言键：\n\n`;

    unusedKeys
      .sort()
      .slice(0, 100)
      .forEach((key) => {
        report += `- \`${key}\`\n`;
      });

    if (unusedKeys.length > 100) {
      report += `\n... 以及其他 ${unusedKeys.length - 100} 个\n`;
    }
  }

  return report;
}

/**
 * 生成 JSON 报告
 */
function generateJsonReport(missingKeys, unusedKeys, keyLocations, fileStats) {
  return {
    timestamp: new Date().toISOString(),
    statistics: {
      totalScannedFiles: fileStats.total,
      usedKeysCount: new Set(Object.keys(keyLocations)).size,
      missingKeysCount: missingKeys.length,
      unusedKeysCount: unusedKeys.length,
    },
    missingKeys: missingKeys.map((key) => ({
      key,
      usageCount: (keyLocations[key] || []).length,
      locations: (keyLocations[key] || []).map((loc) => ({
        file: loc.file,
        line: loc.line,
        context: loc.context,
      })),
    })),
    unusedKeys: unusedKeys.sort(),
  };
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const outputFormat = args.includes('--json') ? 'json' : 'markdown';
  const outputPath = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];

  const baseDir = join(__dirname, '..');
  const platformSrcDir = join(baseDir, 'src');
  const initI18nPath = join(baseDir, '../server/src/db/initTranslation.ts');

  const defaultOutputPath =
    outputFormat === 'json'
      ? join(__dirname, 'i18n-scan-report.json')
      : join(__dirname, 'i18n-scan-report.md');

  const finalOutputPath = outputPath || defaultOutputPath;

  console.log('='.repeat(50));
  console.log('多语言扫描工具（增强版）');
  console.log('='.repeat(50) + '\n');

  // 扫描前端代码
  console.log(`📁 扫描前端代码: ${platformSrcDir}`);
  const files = getAllFiles(platformSrcDir);
  console.log(`✓ 找到 ${files.length} 个 TS/TSX 文件\n`);

  const usedKeys = new Set();
  const keyLocations = {};

  files.forEach((filePath) => {
    const keyData = extractTranslationKeys(filePath);
    const relativePath = relative(baseDir, filePath);

    keyData.forEach((item) => {
      usedKeys.add(item.key);
      if (!keyLocations[item.key]) {
        keyLocations[item.key] = [];
      }
      keyLocations[item.key].push({
        file: relativePath,
        line: item.line,
        context: item.context,
      });
    });
  });

  console.log(`✓ 扫描完成，找到 ${usedKeys.size} 个独立的多语言键\n`);

  // 扫描 initTranslation.ts
  console.log(`📋 扫描多语言定义: ${initI18nPath}`);
  const definedKeys = extractInitI18nKeys(initI18nPath);
  console.log(`✓ 找到 ${definedKeys.size} 个已定义的多语言键\n`);

  // 找出缺失和未使用的键
  const missingKeys = Array.from(usedKeys)
    .filter((key) => !definedKeys.has(key))
    .sort();
  const unusedKeys = Array.from(definedKeys).filter((key) => !usedKeys.has(key));

  console.log(`\n📊 分析结果：`);
  console.log(`  ✗ 缺失的键: ${missingKeys.length} 个`);
  console.log(`  ✗ 未使用的键: ${unusedKeys.length} 个`);
  console.log(`  ✓ 完整的键: ${usedKeys.size - missingKeys.length} 个\n`);

  // 生成报告
  let report;
  if (outputFormat === 'json') {
    report = JSON.stringify(
      generateJsonReport(missingKeys, unusedKeys, keyLocations, {
        total: files.length,
      }),
      null,
      2,
    );
  } else {
    report = generateMarkdownReport(missingKeys, unusedKeys, keyLocations, '多语言扫描报告');
  }

  // 写入文件
  writeFileSync(finalOutputPath, report, 'utf-8');
  console.log(`💾 报告已保存到: ${finalOutputPath}`);
  console.log('\n' + '='.repeat(50) + '\n');

  // 如果指定了阻断标志且存在缺失的多语言键，则抛错并退出进程
  const failOnMissing = args.includes('--fail-on-missing') || args.includes('--ci');
  if (failOnMissing && missingKeys.length > 0) {
    console.error(
      `❌ 错误: 发现 ${missingKeys.length} 个缺失的多语言翻译键，请在后端相应的 translation.ts 中补充定义：`,
    );
    missingKeys.forEach((key) => {
      const locations = keyLocations[key] || [];
      console.error(`  - 键名: \x1b[31m${key}\x1b[0m`);
      locations.forEach((loc) => {
        console.error(`    位置: ${loc.file}:${loc.line} - \`${loc.context}\``);
      });
    });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
