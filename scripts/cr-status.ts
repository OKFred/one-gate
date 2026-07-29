import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const tasksJsonPath = path.join(rootDir, 'docs', 'code-reviews', 'tasks.json');

interface TaskItem {
  id: string;
  commitHash: string;
  commitSubject: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
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

function showDashboard() {
  console.log(`\n================================================================================`);
  console.log(`🤖 AI Code Review 任务看板 (Task Dashboard)`);
  console.log(`================================================================================\n`);

  if (!fs.existsSync(tasksJsonPath)) {
    console.log(`ℹ️  暂无正在运行或已完成的 AI CR 任务。`);
    console.log(`================================================================================\n`);
    return;
  }

  let data: TasksData = { activeTasks: [], history: [] };
  try {
    data = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf-8'));
  } catch (e: any) {
    console.error(`⚠️ 读取 tasks.json 失败:`, e.message);
    return;
  }

  // 1. 正在运行的任务
  if (data.activeTasks && data.activeTasks.length > 0) {
    console.log(`⏳ 【正在运行中的任务】(${data.activeTasks.length} 个):`);
    for (const task of data.activeTasks) {
      const startMs = new Date(task.startTime).getTime();
      const elapsedSec = !isNaN(startMs) ? Math.round((Date.now() - startMs) / 1000) : '-';
      console.log(` ├─ 提交 Hash: [${task.commitHash}] - ${task.commitSubject}`);
      console.log(` │  ├─ 状态: ⏳ RUNNING`);
      console.log(` │  ├─ 模型: ${task.model}`);
      console.log(` │  ├─ 启动时间: ${task.startTime}`);
      console.log(` │  └─ 已等待耗时: ${elapsedSec}s`);
    }
  } else {
    console.log(`🟢 【当前状态】没有正在执行的 AI CR 任务。`);
  }

  console.log(`\n--------------------------------------------------------------------------------`);

  // 2. 历史完成记录
  if (data.history && data.history.length > 0) {
    console.log(`📜 【最近审查历史记录】(展示最新 ${Math.min(data.history.length, 5)} 条):`);
    for (const task of data.history.slice(0, 5)) {
      const statusIcon = task.status === 'COMPLETED' ? '✅ COMPLETED' : '❌ FAILED';
      const chunksStr = task.chunksCount ? ` (共 ${task.chunksCount} 份)` : '';
      console.log(` ├─ [${task.commitHash}] ${task.commitSubject}${chunksStr}`);
      console.log(` │  ├─ 结果: ${statusIcon}`);
      console.log(` │  ├─ 耗时: API ${task.apiDurationSec ?? '-'}s | 总计 ${task.durationSec ?? '-'}s`);
      const rList = task.reports && task.reports.length > 0 ? task.reports : ((task as any).reportPath ? [(task as any).reportPath] : []);
      if (rList.length > 0) {
        console.log(` │  └─ 报告列表 (${rList.length} 份):`);
        rList.forEach((rPath, idx) => {
          console.log(` │     ├─ [${idx + 1}/${rList.length}] ${rPath}`);
        });
      } else if (task.error) {
        console.log(` │  └─ 失败原因: ${task.error}`);
      }
    }
  } else {
    console.log(`📜 【历史记录】暂无审查历史。`);
  }

  console.log(`\n================================================================================\n`);
}

showDashboard();
