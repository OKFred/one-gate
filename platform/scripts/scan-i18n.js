#!/usr/bin/env node

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 扫描前端多语言使用情况的脚本
 * 改进的正则表达式：t\(\s*['"`]([^'"`]+)['"`]\s*\)
 * 优点：
 * 1. \s* 允许括号和引号之间有空格
 * 2. ['"`] 支持单引号、双引号、反引号
 * 3. [^'"`]+ 使用字符类而不是贪心匹配，避免单行多个翻译被合并
 * 4. 使用全局和多行标志确保捕获所有匹配
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
      // 跳过某些目录
      if (!file.includes('node_modules') && !file.includes('.')) {
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
    const keys = new Set();

    let match;
    // 重置正则表达式的 lastIndex
    TRANSLATION_REGEX.lastIndex = 0;

    while ((match = TRANSLATION_REGEX.exec(content)) !== null) {
      const key = match[1].trim();
      // 排除模板字符串和非规范键
      if (key && !key.includes('${') && isValidTranslationKey(key)) {
        keys.add(key);
      }
    }

    return keys;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return new Set();
  }
}

/**
 * 从 initTranslation.ts 文件中提取所有多语言键
 */
function extractInitI18nKeys(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const keys = new Set();

    // 匹配 tKey 的值，例如：tKey: "home.title"
    const keyRegex = /tKey:\s*['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = keyRegex.exec(content)) !== null) {
      const key = match[1].trim();
      keys.add(key);
    }

    return keys;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return new Set();
  }
}

/**
 * 主函数
 */
async function main() {
  const platformSrcDir = join(__dirname, '../src');
  const initI18nPath = join(__dirname, '../../server/src/db/initTranslation.ts');
  const outputPath = join(__dirname, './i18n-scan-report.md');

  console.log('开始扫描多语言使用情况...\n');

  // 扫描前端代码
  console.log(`扫描前端代码: ${platformSrcDir}`);
  const files = getAllFiles(platformSrcDir);
  console.log(`找到 ${files.length} 个 TS/TSX 文件\n`);

  const usedKeys = new Set();
  const keyLocations = new Map();

  files.forEach((filePath) => {
    const keys = extractTranslationKeys(filePath);
    const relativePath = relative(join(__dirname, '..'), filePath);

    keys.forEach((key) => {
      usedKeys.add(key);
      if (!keyLocations.has(key)) {
        keyLocations.set(key, []);
      }
      keyLocations.get(key).push(relativePath);
    });
  });

  console.log(`扫描完成，找到 ${usedKeys.size} 个独立的多语言键\n`);

  // 扫描 initTranslation.ts
  console.log(`扫描多语言定义: ${initI18nPath}`);
  const definedKeys = extractInitI18nKeys(initI18nPath);
  console.log(`找到 ${definedKeys.size} 个已定义的多语言键\n`);

  // 找出缺失的键
  const missingKeys = [];
  usedKeys.forEach((key) => {
    if (!definedKeys.has(key)) {
      missingKeys.push(key);
    }
  });

  missingKeys.sort();

  console.log(`缺失的多语言键: ${missingKeys.length} 个\n`);

  // 生成报告
  let report = `# 多语言扫描报告\n\n`;
  report += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

  report += `## 统计摘要\n\n`;
  report += `- 已扫描的前端文件数：${files.length}\n`;
  report += `- 前端代码中使用的多语言键数：${usedKeys.size}\n`;
  report += `- initTranslation.ts 中定义的多语言键数：${definedKeys.size}\n`;
  report += `- **缺失的多语言键数：${missingKeys.length}**\n\n`;

  if (missingKeys.length > 0) {
    report += `## 缺失的多语言键\n\n`;
    report += `以下是前端代码中使用但未在 initTranslation.ts 中定义的多语言键：\n\n`;

    missingKeys.forEach((key) => {
      const locations = keyLocations.get(key) || [];
      report += `### \`${key}\`\n\n`;
      report += `**使用位置**：\n`;
      locations.forEach((loc) => {
        report += `- ${loc}\n`;
      });
      report += `\n`;
    });
  } else {
    report += `## 结果\n\n`;
    report += `✅ 所有前端使用的多语言键都已在 initTranslation.ts 中定义！\n\n`;
  }

  // 附加：已定义但未使用的键
  const unusedKeys = [];
  definedKeys.forEach((key) => {
    if (!usedKeys.has(key)) {
      unusedKeys.push(key);
    }
  });

  if (unusedKeys.length > 0) {
    report += `## 已定义但未使用的多语言键\n\n`;
    report += `以下是在 initTranslation.ts 中定义但前端代码中未使用的多语言键：\n\n`;
    report += `共 ${unusedKeys.length} 个：\n\n`;

    unusedKeys.sort().forEach((key) => {
      report += `- \`${key}\`\n`;
    });
  }

  // 写入文件
  writeFileSync(outputPath, report, 'utf-8');
  console.log(`\n报告已保存到: ${outputPath}`);
  console.log(`\n摘要:`);
  console.log(`- 缺失的键: ${missingKeys.length}`);
  console.log(`- 未使用的键: ${unusedKeys.length}`);
}

main().catch((error) => {
  console.error('发生错误:', error);
  process.exit(1);
});
