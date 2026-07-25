import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// 获取根目录路径
const rootDir = process.cwd();

/**
 * 辅助函数：从根目录 .env 加载环境变量（若 process.env 中不存在）
 */
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// 1. 获取环境变量与配置参数
const baseURL = process.env.AI_BASE_URL;
const apiKey = process.env.AI_KEY;
const model = process.env.AI_MODEL || 'qwen3.5:27b';
const maxDiffBytes = parseInt(process.env.AI_MAX_DIFF_BYTES || '200000', 10);
const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '120000', 10); // 默认 120 秒超时
const outputDirRel = process.env.AI_REVIEW_OUTPUT_DIR || path.join('docs', 'code-reviews');

if (!baseURL || !apiKey) {
  console.log('⏭️  AI Review Skipped: AI_BASE_URL or AI_KEY not configured.');
  process.exit(0);
}

// 统计计时器
const startTime = Date.now();

// 2. 获取当前 commit Hash 和 提交信息
let commitHash = 'HEAD';
let commitSubject = '';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: rootDir }).trim();
  commitSubject = execSync('git log -1 --format="%s"', { encoding: 'utf-8', cwd: rootDir }).trim();
} catch (e: any) {
  console.error('⚠️ Failed to fetch git commit info:', e.message);
  process.exit(0);
}

// 3. 获取本次提交的 diff
const excludes = [
  ':(exclude)pnpm-lock.yaml',
  ':(exclude)package-lock.json',
  ':(exclude)platform/public/version.json',
  ':(exclude)server/wrangler.jsonc',
  ':(exclude)server/.env',
  ':(exclude)server/.dev.vars',
].join(' ');

const gitDiffCmd = `git show ${commitHash} -- . ${excludes}`;
let diffContent = '';
const gitDiffStartTime = Date.now();
try {
  diffContent = execSync(gitDiffCmd, {
    encoding: 'utf-8',
    cwd: rootDir,
    maxBuffer: 20 * 1024 * 1024,
  });
} catch (e: any) {
  console.error('⚠️ Failed to fetch git diff:', e.message);
  process.exit(0);
}
const gitDiffDuration = Date.now() - gitDiffStartTime;

if (!diffContent || diffContent.trim().length === 0) {
  console.log('ℹ️ No reviewable code changes found in this commit. Skipped.');
  process.exit(0);
}

const diffCharCount = diffContent.length;
const diffLineCount = diffContent.split('\n').length;

// 4. 上下文防过长截断处理
let isTruncated = false;
if (diffContent.length > maxDiffBytes) {
  isTruncated = true;
  let diffStat = '';
  try {
    diffStat = execSync(`git show --stat ${commitHash}`, { encoding: 'utf-8', cwd: rootDir });
  } catch (e) {
    /* ignore */
  }
  diffContent =
    `[NOTE: Diff content exceeded limit of ${maxDiffBytes} characters. Truncated summary below]\n\n` +
    `--- CHANGED FILES SUMMARY ---\n${diffStat}\n\n` +
    `--- TRUNCATED DIFF (FIRST ${maxDiffBytes} CHARS) ---\n` +
    diffContent.slice(0, maxDiffBytes);
}

// 5. 动态装载 .agents 规约
const agentsDir = path.join(rootDir, '.agents');
let projectRules = '';

function readAgentFile(filename: string): string {
  const filePath = path.join(agentsDir, filename);
  if (fs.existsSync(filePath)) {
    return `\n\n### 规约文档: ${filename}\n` + fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

projectRules += readAgentFile('AGENTS.md');
projectRules += readAgentFile('global.md');
projectRules += readAgentFile('workflow.md');

if (diffContent.includes('server/')) {
  projectRules += readAgentFile('backend.md');
}
if (diffContent.includes('platform/')) {
  projectRules += readAgentFile('frontend.md');
}

const rulesCharCount = projectRules.length;

// 6. 构造 AI Prompt 与 长度/Token 估算
const systemPrompt = `你是一位严谨资深的全栈架构师与代码审查专家。
你的任务是根据项目设定的【团队开发规范】，对最新的 Git 代码提交做深入、全面且有针对性的审查。

审查要求与重点：
1. **潜在风险与 Bug**：检查逻辑漏洞、异步异常捕获、内存泄漏、未处理的边缘边界条件及安全隐患。
2. **规范遵从度**：严格核查代码是否符合项目的开发规范（如 JSDoc 标准注释、异步 API 规则、HTTP 统一响应结构等）。
3. **架构与性能**：代码是否冗余，类型定义是否严谨，是否有性能优化空间。
4. **输出格式**：请使用结构清晰的 Markdown 格式输出代码审查报告。对于发现的问题，务必指明具体文件、可能引发的问题，并提供改进后的代码示例。

项目规范参考如下：
${projectRules}`;

const userPrompt = `本次 Commit 信息：
- Commit Hash: ${commitHash}
- Commit Message: ${commitSubject}
${isTruncated ? '⚠️ 提示：由于本次提交文件变更较多，系统已对超长 Diff 进行了截断处理。' : ''}

本次提交的具体代码变更 (Git Diff)：
\`\`\`diff
${diffContent}
\`\`\`

请根据团队开发规范，输出本次代码提交的详细 AI 审查报告。`;

const totalPromptChars = systemPrompt.length + userPrompt.length;
// 粗略估算 Token 数量（中英混合按 ~3 字符/Token 计算）
const estimatedTokens = Math.round(totalPromptChars / 3);

// 7. 发送带超时控制的 API 请求
async function main() {
  console.log(`🤖 Starting AI Code Review for commit [${commitHash}] (${commitSubject})...`);
  console.log(`📡 Model: ${model} | BaseURL: ${baseURL}`);
  console.log(`📊 Input Stats: DiffChars=${diffCharCount} (Lines=${diffLineCount}), RulesChars=${rulesCharCount}`);
  console.log(`🧮 Prompt Total: ${totalPromptChars} chars (~${estimatedTokens} tokens)`);
  console.log(`⏱️ Timeout limit: ${timeoutMs / 1000}s`);

  const endpoint = `${baseURL.replace(/\/+$/, '')}/chat/completions`;

  // 超时控制器
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const apiStartTime = Date.now();
  let apiDuration = 0;
  let reviewMarkdown = '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    apiDuration = Date.now() - apiStartTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as any;
    reviewMarkdown = data.choices?.[0]?.message?.content || 'AI 未生成任何回复内容。';

  } catch (error: any) {
    clearTimeout(timer);
    apiDuration = Date.now() - apiStartTime;
    if (error.name === 'AbortError') {
      console.error(`❌ AI Code Review Timed Out after ${timeoutMs / 1000} seconds!`);
      process.exit(1);
    } else {
      console.error('❌ AI Code Review Request Failed:', error.message);
      process.exit(1);
    }
  }

  const totalDuration = Date.now() - startTime;
  const outputChars = reviewMarkdown.length;

  // 8. 写入包含统计信息的 Markdown 报告
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const reportDir = path.resolve(rootDir, outputDirRel);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportFileName = `${commitHash}_${timestamp}.md`;
  const reportPath = path.join(reportDir, reportFileName);

  const statsSection = `
> [!NOTE]
> **📊 审核性能与消耗统计**
> - **提交 Hash**: \`${commitHash}\` (${commitSubject})
> - **审核模型**: \`${model}\`
> - **Diff 修改行数 / 字符**: ${diffLineCount} 行 / ${diffCharCount} 字符 (${isTruncated ? '已截断' : '全量'})
> - **加载规约字符数**: ${rulesCharCount} 字符
> - **Prompt 输入长度**: ${totalPromptChars} 字符 (约 ~${estimatedTokens} tokens)
> - **AI 响应长度**: ${outputChars} 字符
> - **耗时统计**: API 请求 ${ (apiDuration / 1000).toFixed(2) }s | 总耗时 ${ (totalDuration / 1000).toFixed(2) }s
`;

  const fullReportContent = `# 代码提交 AI 审核报告 (${commitHash})

${statsSection}

---

${reviewMarkdown}
`;

  fs.writeFileSync(reportPath, fullReportContent, 'utf-8');

  console.log(`\n==================================================`);
  console.log(`✅ AI Code Review Completed!`);
  console.log(`⏱️  Stats: API=${(apiDuration / 1000).toFixed(2)}s | Total=${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`📝 Output: ${outputChars} chars`);
  console.log(`📄 Report saved to: ${path.relative(rootDir, reportPath)}`);
  console.log(`==================================================\n`);
}

main();
