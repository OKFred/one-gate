import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// 获取根目录路径
const rootDir = process.cwd();

/**
 * 辅助函数：从根目录 .env 加载环境变量
 */
function loadEnv() {
  const envPath = path.join(rootDir, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// 环境变量与配置参数
const baseURL = process.env.AI_BASE_URL;
const apiKey = process.env.AI_KEY;
const model = process.env.AI_MODEL || "qwen3.5:27b";
const maxChunkBytes = parseInt(process.env.AI_MAX_DIFF_BYTES || "150000", 10); // 单份 Diff 最大字符数
const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || "180000", 10);
const outputDirRel =
  process.env.AI_REVIEW_OUTPUT_DIR || path.join("docs", "code-reviews");
const reportDir = path.resolve(rootDir, outputDirRel);
const tasksJsonPath = path.join(reportDir, "tasks.json");
const readmePath = path.join(reportDir, "README.md");

if (!baseURL || !apiKey) {
  console.log("⏭️  AI Review Skipped: AI_BASE_URL or AI_KEY not configured.");
  process.exit(0);
}

// 确保输出目录存在
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// 接口定义
interface TaskItem {
  id: string;
  commitHash: string;
  commitSubject: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  model: string;
  startTime: string;
  endTime?: string;
  durationSec?: number;
  apiDurationSec?: number;
  diffLines?: number;
  diffChars?: number;
  promptTokensEst?: number;
  reports?: string[];
  chunksCount?: number;
  error?: string;
}

interface TasksData {
  activeTasks: TaskItem[];
  history: TaskItem[];
}

function loadTasksData(): TasksData {
  if (fs.existsSync(tasksJsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(tasksJsonPath, "utf-8"));
    } catch {
      /* ignore */
    }
  }
  return { activeTasks: [], history: [] };
}

function saveTasksData(data: TasksData) {
  fs.writeFileSync(tasksJsonPath, JSON.stringify(data, null, 2), "utf-8");
  updateReadmeDashboard(data);
}

function updateReadmeDashboard(data: TasksData) {
  let md = `# 🤖 AI Code Review 状态与历史看板\n\n`;

  md += `## ⏳ 正在运行的任务 (${data.activeTasks.length})\n\n`;
  if (data.activeTasks.length === 0) {
    md += `*当前没有正在执行的审查任务。*\n\n`;
  } else {
    md += `| 提交 Hash | 提交说明 | 模型 | 开始时间 | 状态 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const t of data.activeTasks) {
      md += `| \`${t.commitHash}\` | ${t.commitSubject} | \`${t.model}\` | ${t.startTime} | ⏳ **RUNNING** |\n`;
    }
    md += `\n`;
  }

  md += `## 📜 历史审查记录 (最新 20 条)\n\n`;
  if (data.history.length === 0) {
    md += `*暂无历史审查记录。*\n\n`;
  } else {
    md += `| 提交 Hash | 提交说明 | 状态 | 拆分份数 | API总耗时 | 审查报告 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const t of data.history.slice(0, 20)) {
      const statusIcon =
        t.status === "COMPLETED" ? "✅ COMPLETED" : "❌ FAILED";
      let reportLinks = "-";
      const rList =
        t.reports && t.reports.length > 0
          ? t.reports
          : (t as any).reportPath
            ? [(t as any).reportPath]
            : [];
      if (rList.length > 0) {
        reportLinks = rList
          .map(
            (rPath, idx) =>
              `[${idx + 1}/${rList.length}](file:///${path.resolve(rootDir, rPath).replace(/\\/g, "/")})`,
          )
          .join(" | ");
      }
      md += `| \`${t.commitHash}\` | ${t.commitSubject} | ${statusIcon} | ${t.chunksCount || 1} 份 | ${t.apiDurationSec ?? "-"}s | ${reportLinks} |\n`;
    }
  }

  fs.writeFileSync(readmePath, md, "utf-8");
}

const startTime = Date.now();

// 1. 获取当前 commit Hash 和 提交信息
let commitHash = "HEAD";
let commitSubject = "";
let commitMessage = "";
try {
  commitHash = execSync("git rev-parse --short HEAD", {
    encoding: "utf-8",
    cwd: rootDir,
  }).trim();
  commitSubject = execSync('git log -1 --format="%s"', {
    encoding: "utf-8",
    cwd: rootDir,
  }).trim();
  commitMessage = execSync('git log -1 --format="%B"', {
    encoding: "utf-8",
    cwd: rootDir,
  }).trim();
} catch (e: any) {
  console.error("⚠️ Failed to fetch git commit info:", e.message);
  process.exit(0);
}

// 检查 Commit Message 或命令行参数中是否包含 --noCR 标记
const hasNoCRInMsg =
  /--noCR/i.test(commitMessage) || /--noCR/i.test(commitSubject);
const hasNoCRInArgs = process.argv.some((arg) => /^--noCR$/i.test(arg));

if (hasNoCRInMsg || hasNoCRInArgs) {
  console.log(
    "⏭️  AI Review Skipped: Commit message or argument contains '--noCR'.",
  );
  process.exit(0);
}

// 注册新任务
const taskId = `${commitHash}_${Date.now()}`;
const nowIso = new Date().toLocaleString();

const tasksData = loadTasksData();
const currentTask: TaskItem = {
  id: taskId,
  commitHash,
  commitSubject,
  status: "RUNNING",
  model,
  startTime: nowIso,
  reports: [],
};

tasksData.activeTasks = tasksData.activeTasks.filter((t) => t.id !== taskId);
tasksData.activeTasks.push(currentTask);
saveTasksData(tasksData);

// 2. 获取本次提交的 diff
const excludes = [
  ":(exclude)pnpm-lock.yaml",
  ":(exclude)package-lock.json",
  ":(exclude)platform/public/version.json",
  ":(exclude)server/wrangler.jsonc",
  ":(exclude)server/.env",
  ":(exclude)server/.dev.vars",
].join(" ");

const gitDiffCmd = `git show ${commitHash} -- . ${excludes}`;
let rawDiff = "";
try {
  rawDiff = execSync(gitDiffCmd, {
    encoding: "utf-8",
    cwd: rootDir,
    maxBuffer: 30 * 1024 * 1024,
  });
} catch (e: any) {
  console.error("⚠️ Failed to fetch git diff:", e.message);
  currentTask.status = "FAILED";
  currentTask.error = e.message;
  tasksData.activeTasks = tasksData.activeTasks.filter((t) => t.id !== taskId);
  tasksData.history.unshift(currentTask);
  saveTasksData(tasksData);
  process.exit(0);
}

if (!rawDiff || rawDiff.trim().length === 0) {
  console.log("ℹ️ No reviewable code changes found in this commit. Skipped.");
  tasksData.activeTasks = tasksData.activeTasks.filter((t) => t.id !== taskId);
  saveTasksData(tasksData);
  process.exit(0);
}

currentTask.diffLines = rawDiff.split("\n").length;
currentTask.diffChars = rawDiff.length;

// 3. 智能按文件分块 (Diff Chunks)
function splitDiffIntoChunks(diff: string, maxBytes: number): string[] {
  const fileDiffs = diff.split("\ndiff --git ");
  const chunks: string[] = [];
  let currentChunk = "";

  for (let i = 0; i < fileDiffs.length; i++) {
    let fileDiff = fileDiffs[i];
    if (i > 0) fileDiff = "diff --git " + fileDiff;

    if (
      (currentChunk + fileDiff).length > maxBytes &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = fileDiff;
    } else {
      currentChunk += fileDiff;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [diff];
}

const diffChunks = splitDiffIntoChunks(rawDiff, maxChunkBytes);
const totalChunks = diffChunks.length;
currentTask.chunksCount = totalChunks;

// 4. 动态装载 .agents 规约
const agentsDir = path.join(rootDir, ".agents");
function readAgentFile(filename: string): string {
  const filePath = path.join(agentsDir, filename);
  if (fs.existsSync(filePath)) {
    return (
      `\n\n### 规约文档: ${filename}\n` + fs.readFileSync(filePath, "utf-8")
    );
  }
  return "";
}

let baseRules =
  readAgentFile("AGENTS.md") +
  readAgentFile("global.md") +
  readAgentFile("workflow.md");

// 5. 生成极简日期与递增序号文件名 (<commitHash>_<YYYYMM>_<HHmm>_<001|002>.md)
function getNextReportFilename(hash: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyymm = `${now.getFullYear()}${pad(now.getMonth() + 1)}`;
  const hhmm = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  const files = fs.readdirSync(reportDir);
  const prefix = `${hash}_`;
  let maxSeq = 0;

  for (const file of files) {
    if (
      file.startsWith(prefix) &&
      file.endsWith(".md") &&
      file !== "README.md"
    ) {
      const match = file.match(/_(\d{3})\.md$/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, "0");
  return `${hash}_${yyyymm}_${hhmm}_${nextSeq}.md`;
}

// 6. 依次处理并生成份数报告
async function main() {
  console.log(
    `🤖 Starting AI Code Review for commit [${commitHash}] (${commitSubject})...`,
  );
  console.log(`📦 Diff split into ${totalChunks} chunk(s).`);

  let totalApiDuration = 0;

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunkIndexDisplay = `${chunkIdx + 1}/${totalChunks}`; // 编号标示: 1/5, 2/5...
    const chunkDiff = diffChunks[chunkIdx];

    // 针对本 Chunk 内容匹配专有规约
    let chunkRules = baseRules;
    if (chunkDiff.includes("server/"))
      chunkRules += readAgentFile("backend.md");
    if (chunkDiff.includes("platform/"))
      chunkRules += readAgentFile("frontend.md");

    const systemPrompt = `你是一位严谨资深的全栈架构师与代码审查专家。
你的任务是根据项目设定的【团队开发规范】，对最新的 Git 代码提交做深入、全面且有针对性的审查。

审查要求与重点：
1. **潜在风险与 Bug**：检查逻辑漏洞、异步异常捕获、内存泄漏、未处理的边缘边界条件及安全隐患。
2. **规范遵从度**：严格核查代码是否符合项目的开发规范。
3. **架构与性能**：代码是否冗余，类型定义是否严谨，是否有性能优化空间。
4. **输出格式**：请使用结构清晰的 Markdown 格式输出代码审查报告。对于发现的问题，务必指明具体文件、可能引发的问题，并提供改进后的代码示例。

项目规范参考如下：
${chunkRules}`;

    const userPrompt = `本次 Commit 信息：
- Commit Hash: ${commitHash}
- Commit Message: ${commitSubject}
- 报告分份标记: [${chunkIndexDisplay}] (第 ${chunkIdx + 1} 份 / 共 ${totalChunks} 份)

本份提交的具体代码变更片段 (Git Diff Part ${chunkIndexDisplay})：
\`\`\`diff
${chunkDiff}
\`\`\`

请根据团队开发规范，输出本份代码变更的详细 AI 审查报告。`;

    const totalPromptChars = systemPrompt.length + userPrompt.length;
    const estimatedTokens = Math.round(totalPromptChars / 3);

    console.log(
      `\n⏳ Processing part [${chunkIndexDisplay}] (~${estimatedTokens} tokens)...`,
    );

    const endpoint = `${baseURL.replace(/\/+$/, "")}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiStartTime = Date.now();
    let reviewMarkdown = "";
    let apiDuration = 0;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      apiDuration = Date.now() - apiStartTime;
      totalApiDuration += apiDuration;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      reviewMarkdown =
        data.choices?.[0]?.message?.content || "AI 未生成任何回复内容。";
    } catch (error: any) {
      clearTimeout(timer);
      apiDuration = Date.now() - apiStartTime;
      totalApiDuration += apiDuration;

      currentTask.status = "FAILED";
      currentTask.endTime = new Date().toLocaleString();
      currentTask.error =
        error.name === "AbortError"
          ? `Part ${chunkIndexDisplay} Timed out`
          : error.message;

      tasksData.activeTasks = tasksData.activeTasks.filter(
        (t) => t.id !== taskId,
      );
      tasksData.history.unshift(currentTask);
      saveTasksData(tasksData);

      console.error(`❌ Part [${chunkIndexDisplay}] Failed:`, error.message);
      process.exit(1);
    }

    const reportFileName = getNextReportFilename(commitHash);
    const reportPath = path.join(reportDir, reportFileName);

    const statsSection = `
> [!NOTE]
> **📊 审核性能与消耗统计 [${chunkIndexDisplay}]**
> - **提交 Hash**: \`${commitHash}\` (${commitSubject})
> - **分份进度**: **${chunkIndexDisplay}** (第 ${chunkIdx + 1} 份 / 共 ${totalChunks} 份)
> - **审核模型**: \`${model}\`
> - **本份 Diff 字符**: ${chunkDiff.length} 字符 (修改行数 ~${chunkDiff.split("\n").length} 行)
> - **Prompt 输入长度**: ${totalPromptChars} 字符 (约 ~${estimatedTokens} tokens)
> - **AI 响应长度**: ${reviewMarkdown.length} 字符
> - **本份 API 耗时**: ${(apiDuration / 1000).toFixed(2)}s
`;

    // 标题中显式加上 [1/5]、[2/5] 等编号
    const fullReportContent = `# 代码提交 AI 审核报告 (${commitHash}) [${chunkIndexDisplay}]

${statsSection}

---

${reviewMarkdown}
`;

    fs.writeFileSync(reportPath, fullReportContent, "utf-8");

    const relPath = path.relative(rootDir, reportPath);
    currentTask.reports!.push(relPath);
    saveTasksData(tasksData);

    console.log(
      `✅ Part [${chunkIndexDisplay}] Review Completed! Report saved to: ${relPath}`,
    );
  }

  const totalDuration = Date.now() - startTime;
  currentTask.status = "COMPLETED";
  currentTask.endTime = new Date().toLocaleString();
  currentTask.durationSec = parseFloat((totalDuration / 1000).toFixed(1));
  currentTask.apiDurationSec = parseFloat((totalApiDuration / 1000).toFixed(1));

  tasksData.activeTasks = tasksData.activeTasks.filter((t) => t.id !== taskId);
  tasksData.history.unshift(currentTask);
  saveTasksData(tasksData);

  console.log(`\n==================================================`);
  console.log(`🎉 All ${totalChunks} part(s) of AI Code Review completed!`);
  console.log(
    `⏱️  Total API Time: ${(totalApiDuration / 1000).toFixed(2)}s | Total Time: ${(totalDuration / 1000).toFixed(2)}s`,
  );
  console.log(`==================================================\n`);
}

main();
