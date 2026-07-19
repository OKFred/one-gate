import { baseTableInit } from "@hodor/core/db/utils/schema";
import { initDatabase } from "@hodor/core/db/init";
import db from "@hodor/core/db/index";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, "sql");

interface SqlFileInfo {
  relativePath: string;
  name: string;
  absolutePath: string;
}

function getSqlFilesRec(dir: string, baseDir = dir): SqlFileInfo[] {
  const results: SqlFileInfo[] = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...getSqlFilesRec(filePath, baseDir));
    } else if (file.endsWith(".sql")) {
      results.push({
        relativePath: path.relative(baseDir, filePath),
        name: file.replace(/\.sql$/, ""),
        absolutePath: filePath,
      });
    }
  }
  return results;
}

function getTargetSqlDir(isMigration: boolean): string {
  return isMigration
    ? path.resolve(__dirname, "migrations")
    : path.resolve(__dirname, "sql");
}

/**
 * 动态获取所有需要初始化的数据库表名 (通过读取 src/db/sql 目录及其子目录下的文件名)
 */
function getTables(): string[] {
  if (!fs.existsSync(sqlDir)) {
    console.warn("⚠️  未找到 SQL 脚本目录:", sqlDir);
    return [];
  }
  return getSqlFilesRec(sqlDir)
    .map((f) => f.name)
    .sort();
}

/**
 * [Node 模式] 使用 Drizzle 引擎初始化表结构
 * 适用于直接连接 SQLite 文件的场景 (如本地 Node 运行)
 */
export async function runDrizzleInit(isMigration: boolean) {
  const targetDir = getTargetSqlDir(isMigration);
  console.log(
    `\n🏗️  正在同步本地 SQLite [${isMigration ? "增量" : "全量"}] 结构...`
  );
  console.log("-------------------------------------------");

  if (!fs.existsSync(targetDir)) {
    console.warn("⚠️  未找到指定的 SQL 脚本目录:", targetDir);
    return;
  }

  if (isMigration) {
    const files = fs
      .readdirSync(targetDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const filePath = path.join(targetDir, file);
      try {
        const sql = fs.readFileSync(filePath, "utf8");
        const sqlStatements = sql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);

        for (const statement of sqlStatements) {
          await db.run(statement);
        }
        console.log(`✅ [Migration] ${file} 执行成功`);
      } catch (error) {
        console.error(`❌ [Migration] ${file} 执行失败:`, error);
      }
    }
  } else {
    const tables = getTables();
    for (const tableName of tables) {
      try {
        await baseTableInit(tableName);
        console.log(`✅ [Drizzle] ${tableName} 同步成功`);
      } catch (error) {
        console.error(`❌ [Drizzle] ${tableName} 同步失败:`, error);
      }
    }
  }
}

/**
 * [Worker 模式] 使用 Wrangler/D1 引擎同步 SQL 文件
 * 遍历 src/db/sql 目录下的所有脚本并推送到 D1
 */
async function runWranglerInit(
  target: "local" | "remote",
  isMigration: boolean
) {
  const targetDir = getTargetSqlDir(isMigration);
  if (!fs.existsSync(targetDir)) {
    console.warn("⚠️  未找到指定的 SQL 脚本目录:", targetDir);
    return;
  }

  const files = isMigration
    ? fs
        .readdirSync(targetDir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => ({
          relativePath: f,
          absolutePath: path.join(targetDir, f),
        }))
    : getSqlFilesRec(targetDir).sort((a, b) => a.name.localeCompare(b.name));

  console.log(
    `\n⚡ 正在通过 Wrangler 引擎同步 D1 (hodor_db) [${target}] [${isMigration ? "增量" : "全量"}] 环境...`
  );
  console.log(`📂 发现 ${files.length} 个 SQL 脚本\n`);

  let successCount = 0;
  for (const file of files) {
    const filePath = file.absolutePath;
    let tempFilePath: string | null = null;
    try {
      console.log(`📄 正在同步: ${file.relativePath}...`);
      const targetFlag = target === "remote" ? "--remote" : "--local";

      // 动态注入 IF NOT EXISTS 以保证幂等性
      const sqlContent = fs.readFileSync(filePath, "utf8");
      const safeSqlContent = sqlContent
        .replace(
          /CREATE TABLE(?! IF NOT EXISTS) `/gi,
          "CREATE TABLE IF NOT EXISTS `"
        )
        .replace(
          /CREATE INDEX(?! IF NOT EXISTS) `/gi,
          "CREATE INDEX IF NOT EXISTS `"
        )
        .replace(
          /CREATE UNIQUE INDEX(?! IF NOT EXISTS) `/gi,
          "CREATE UNIQUE INDEX IF NOT EXISTS `"
        );

      tempFilePath = path.join(
        os.tmpdir(),
        `temp_init_${Date.now()}_${path.basename(filePath)}`
      );
      fs.writeFileSync(tempFilePath, safeSqlContent, "utf8");

      execSync(
        `npx wrangler d1 execute hodor_db ${targetFlag} --file=${tempFilePath} --yes`,
        {
          stdio: "inherit",
        }
      );
      successCount++;
    } catch (error: any) {
      console.error(
        `\n❌ [Wrangler] ${file.relativePath} 同步失败:`,
        error.message
      );
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  console.log(
    `\n✨ D1 [${target}] 同步完成: 成功 ${successCount}/${files.length} 个脚本`
  );
}

/**
 * 解析命令行参数
 * 支持 Flag 模式 (--node) 和 位置参数模式 (node)
 * 这样就可以直接用 pnpm run db:init node 而不需要 -- 了
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const lowerArgs = args.map((a) => a.toLowerCase());

  // 检测 --env=filename 或 env=filename
  const envArg = args.find(
    (a) => a.startsWith("--env=") || a.toLowerCase().startsWith("env=")
  );
  const envFile = envArg ? envArg.split("=")[1] : null;

  return {
    isNode: lowerArgs.includes("node"),
    isWorker: lowerArgs.includes("worker"),
    isRemote: lowerArgs.includes("remote"),
    isMigration:
      lowerArgs.includes("migration") || lowerArgs.includes("--migration"),
    isLocal:
      lowerArgs.includes("local") ||
      (!lowerArgs.includes("remote") && lowerArgs.includes("worker")),
    envFile,
    showHelp:
      lowerArgs.length === 0 ||
      lowerArgs.includes("help") ||
      lowerArgs.includes("h"),
  };
}

/**
 * 打印帮助信息
 */
function printHelp() {
  console.log(`
🚀 数据库 DDL 同步工具
用法: pnpm run db:init [环境] [选项]

环境:
  node               初始化本地 SQLite 文件 (针对 local.db)
  worker             初始化 Cloudflare D1 数据库

选项:
  local              (针对 worker) 指定 [本地] 环境 (默认)
  remote             (针对 worker) 指定 [远程] 环境
  migration          开启增量迁移 SQL 模式 (执行 migrations 目录下的增量 SQL)
  --env=<filename>   手动加载环境配置文件 (如 --env=.env.development)
  help               显示此帮助信息

示例:
  pnpm run db:init node
  pnpm run db:init node migration
  pnpm run db:init node --env=.env.development
  pnpm run db:init worker
  pnpm run db:init worker remote migration
  `);
}

/**
 * 主入口
 */
async function main() {
  const flags = parseArgs();

  if (flags.showHelp) {
    printHelp();
    return;
  }

  // 加载指定的环境文件 (Node 20.6+)
  if (flags.envFile) {
    const fullPath = path.resolve(process.cwd(), flags.envFile);
    if (fs.existsSync(fullPath)) {
      console.log(`📡 加载环境配置: ${flags.envFile}`);
      process.loadEnvFile(fullPath);
    } else {
      console.error(`❌ 未找到环境配置文件: ${flags.envFile}`);
      process.exit(1);
    }
  }

  if (flags.isNode) {
    await runDrizzleInit(flags.isMigration);

    // 尝试手动向 SQLite 补充新增的 source 字段（如果表已经存在）
    try {
      await db.run(
        "ALTER TABLE system_schema_form ADD COLUMN source TEXT NOT NULL DEFAULT 'user';"
      );
      console.log("ℹ️ 已手动为 system_schema_form 补充 source 字段");
    } catch (e: any) {
      const msg = e.message || "";
      if (
        !msg.includes("duplicate column name") &&
        !msg.includes("already exists")
      ) {
        console.warn("⚠️ 尝试补齐 source 字段时遇到非预期错误:", msg);
      }
    }

    console.log(
      "\n📦 正在同步数据库基础数据 (User, Role, Menu, Translation)..."
    );
    try {
      await initDatabase();
      console.log("✅ 数据库基础数据同步成功");
    } catch (error) {
      console.error("❌ 数据库基础数据同步失败:", error);
      process.exit(1);
    }
  }

  if (flags.isWorker) {
    const target = flags.isRemote ? "remote" : "local";
    await runWranglerInit(target, flags.isMigration);
  }

  console.log("\n🎉 数据库 DDL 指令执行完毕！\n");
}

// 脚本执行
main().catch((err) => {
  console.error("🔥 全局同步异常:", err);
  process.exit(1);
});
