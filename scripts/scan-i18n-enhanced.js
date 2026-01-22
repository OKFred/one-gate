#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
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
    const content = fs.readFileSync(filePath, 'utf-8');
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
          context: match[0]
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
 * 从 initI18n.ts 文件中提取所有多语言键
 */
function extractInitI18nKeys(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const keys = new Set();
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
 * 生成 Markdown 报告
 */
function generateMarkdownReport(missingKeys, unusedKeys, keyLocations, title) {
  let report = `# ${title}\n\n`;
  report += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
  
  report += `## 统计摘要\n\n`;
  report += `- 前端代码中使用的多语言键数：${new Set([...Object.values(keyLocations).flat().map(item => item.key)]).size}\n`;
  report += `- initI18n.ts 中定义的多语言键数：${[...new Set(Object.values(keyLocations).flat().map(item => item.key))].length + unusedKeys.length}\n`;
  report += `- **缺失的多语言键数：${missingKeys.length}**\n`;
  report += `- **未使用的多语言键数：${unusedKeys.length}**\n\n`;
  
  if (missingKeys.length > 0) {
    report += `## 缺失的多语言键（${missingKeys.length}个）\n\n`;
    report += `以下是前端代码中使用但未在 initI18n.ts 中定义的多语言键：\n\n`;
    
    missingKeys.forEach(key => {
      const locations = keyLocations[key] || [];
      report += `### \`${key}\`\n\n`;
      report += `**使用次数**：${locations.length}\n\n`;
      report += `**使用位置**：\n`;
      locations.forEach(loc => {
        report += `- ${loc.file}:${loc.line} - \`${loc.context}\`\n`;
      });
      report += `\n`;
    });
  }
  
  if (unusedKeys.length > 0) {
    report += `## 已定义但未使用的多语言键（${unusedKeys.length}个）\n\n`;
    report += `以下是在 initI18n.ts 中定义但前端代码中未使用的多语言键：\n\n`;
    
    unusedKeys.sort().slice(0, 100).forEach(key => {
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
      unusedKeysCount: unusedKeys.length
    },
    missingKeys: missingKeys.map(key => ({
      key,
      usageCount: (keyLocations[key] || []).length,
      locations: (keyLocations[key] || []).map(loc => ({
        file: loc.file,
        line: loc.line,
        context: loc.context
      }))
    })),
    unusedKeys: unusedKeys.sort()
  };
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const outputFormat = args.includes('--json') ? 'json' : 'markdown';
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  const baseDir = path.join(__dirname, '..');
  const platformSrcDir = path.join(baseDir, 'platform/src');
  const initI18nPath = path.join(baseDir, 'server/src/db/initI18n.ts');
  
  const defaultOutputPath = outputFormat === 'json' 
    ? path.join(baseDir, 'i18n-scan-report.json')
    : path.join(baseDir, 'i18n-scan-report.md');
  
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
  
  files.forEach(filePath => {
    const keyData = extractTranslationKeys(filePath);
    const relativePath = path.relative(baseDir, filePath);
    
    keyData.forEach(item => {
      usedKeys.add(item.key);
      if (!keyLocations[item.key]) {
        keyLocations[item.key] = [];
      }
      keyLocations[item.key].push({
        file: relativePath,
        line: item.line,
        context: item.context
      });
    });
  });
  
  console.log(`✓ 扫描完成，找到 ${usedKeys.size} 个独立的多语言键\n`);
  
  // 扫描 initI18n.ts
  console.log(`📋 扫描多语言定义: ${initI18nPath}`);
  const definedKeys = extractInitI18nKeys(initI18nPath);
  console.log(`✓ 找到 ${definedKeys.size} 个已定义的多语言键\n`);
  
  // 找出缺失和未使用的键
  const missingKeys = Array.from(usedKeys).filter(key => !definedKeys.has(key)).sort();
  const unusedKeys = Array.from(definedKeys).filter(key => !usedKeys.has(key));
  
  console.log(`\n📊 分析结果：`);
  console.log(`  ✗ 缺失的键: ${missingKeys.length} 个`);
  console.log(`  ✗ 未使用的键: ${unusedKeys.length} 个`);
  console.log(`  ✓ 完整的键: ${usedKeys.size - missingKeys.length} 个\n`);
  
  // 生成报告
  let report;
  if (outputFormat === 'json') {
    report = JSON.stringify(generateJsonReport(missingKeys, unusedKeys, keyLocations, {
      total: files.length
    }), null, 2);
  } else {
    report = generateMarkdownReport(missingKeys, unusedKeys, keyLocations, '多语言扫描报告');
  }
  
  // 写入文件
  fs.writeFileSync(finalOutputPath, report, 'utf-8');
  console.log(`💾 报告已保存到: ${finalOutputPath}`);
  console.log('\n' + '='.repeat(50) + '\n');
}

main().catch(error => {
  console.error('❌ 发生错误:', error);
  process.exit(1);
});
