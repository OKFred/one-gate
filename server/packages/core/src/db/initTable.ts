import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, "sql");

interface SqlFileInfo {
  relativePath: string;
  name: string;
  absolutePath: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getExecutable(name: "npx" | "pnpm"): string {
  return process.platform === "win32" ? `${name}.cmd` : name;
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
export async function runDrizzleInit() {
  const { baseTableInit } = await import("@hodor/core/db/utils/schema");
  console.log("\n🏗️  正在同步本地 SQLite [新库全量] 结构...");
  console.log("-------------------------------------------");

  const tables = getTables();
  if (!tables.length) throw new Error("No fresh-database DDL files found");
  for (const tableName of tables) {
    await baseTableInit(tableName, undefined, { failOnError: true });
    console.log(`✅ [Drizzle] ${tableName} 同步成功`);
  }
}

/**
 * [Worker 模式] 使用 Wrangler/D1 引擎同步 SQL 文件
 * 遍历 src/db/sql 目录下的所有脚本并推送到 D1
 */
async function runWranglerInit(target: "local" | "remote") {
  const files = getSqlFilesRec(sqlDir).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  if (!files.length) throw new Error("No fresh-database DDL files found");

  console.log(
    `\n⚡ 正在通过 Wrangler 引擎同步 D1 (hodor_db) [${target}] [新库全量] 环境...`
  );
  console.log(`📂 发现 ${files.length} 个 SQL 脚本\n`);

  let successCount = 0;
  const failedFiles: string[] = [];
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

      execFileSync(
        getExecutable("npx"),
        [
          "wrangler",
          "d1",
          "execute",
          "hodor_db",
          targetFlag,
          `--file=${tempFilePath}`,
          "--yes",
        ],
        {
          stdio: "inherit",
        }
      );
      successCount++;
    } catch (error: unknown) {
      failedFiles.push(file.relativePath);
      console.error(
        `\n❌ [Wrangler] ${file.relativePath} 同步失败:`,
        getErrorMessage(error)
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
  if (failedFiles.length > 0) {
    throw new Error(`D1 同步失败: ${failedFiles.join(", ")}`);
  }
}

/** 使用 Wrangler 官方账本只应用未执行的 Worker D1 迁移。 */
function runWranglerMigrations(target: "local" | "remote"): void {
  const workerDir = path.resolve(__dirname, "../../../../apps/server");
  execFileSync(
    getExecutable("pnpm"),
    [
      "exec",
      "wrangler",
      "d1",
      "migrations",
      "apply",
      "hodor_db",
      target === "remote" ? "--remote" : "--local",
    ],
    { cwd: workerDir, stdio: "inherit" }
  );
}

/**
 * 解析命令行参数
 * 支持 Flag 模式 (--node) 和 位置参数模式 (node)
 * 这样就可以直接用 pnpm run db:init node 而不需要 -- 了
 */
export function parseInitArgs(args: string[]) {
  const lowerArgs = args.map((a) => a.toLowerCase().replace(/^--/, ""));

  // 检测 --env=filename 或 env=filename
  const envArg = args.find((a) =>
    a.toLowerCase().replace(/^--/, "").startsWith("env=")
  );
  const envFile = envArg ? envArg.slice(envArg.indexOf("=") + 1) : null;

  if (!lowerArgs.some((arg) => ["help", "h"].includes(arg))) {
    for (const arg of lowerArgs) {
      if (
        arg &&
        !["node", "worker", "local", "remote", "migration"].includes(arg) &&
        !arg.startsWith("env=")
      )
        throw new Error(
          "Unsupported initialization argument; see db:init help"
        );
    }
    if (lowerArgs.includes("node") && lowerArgs.includes("migration"))
      throw new Error(
        "db:init node migration is retired: it replayed untracked SQL and synchronized seeds. " +
          "Use db:migrate:department:node, db:migrate:role:node or db:migrate:assets:node " +
          "with --database=<existing local SQLite file>; see docs/database-migrations.md. " +
          "Older databases require version-specific migration review."
      );
    if (
      args.length &&
      Number(lowerArgs.includes("node")) +
        Number(lowerArgs.includes("worker")) !==
        1
    )
      throw new Error(
        "Select exactly one initialization target: node or worker"
      );
    if (
      (lowerArgs.includes("local") && lowerArgs.includes("remote")) ||
      (lowerArgs.includes("node") &&
        (lowerArgs.includes("local") || lowerArgs.includes("remote")))
    )
      throw new Error("local/remote are mutually exclusive Worker options");
    if (envArg && !envFile) throw new Error("An environment file is required");
    if (lowerArgs.filter((arg) => arg.startsWith("env=")).length > 1)
      throw new Error("Select exactly one environment file");
  }

  return {
    isNode: lowerArgs.includes("node"),
    isWorker: lowerArgs.includes("worker"),
    isRemote: lowerArgs.includes("remote"),
    isMigration: lowerArgs.includes("migration"),
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
  migration          仅 worker：调用 Wrangler 官方迁移账本
  --env=<filename>   手动加载环境配置文件 (如 --env=.env.development)
  help               显示此帮助信息

示例:
  pnpm run db:init node
  pnpm run db:init node --env=.env.development
  pnpm run db:init worker
  pnpm run db:init worker remote migration

已有数据库升级参见 docs/database-migrations.md；node migration 旧入口已停用。
Node 初始化会同步基础种子，可能覆盖自定义配置，仅适合新库。
  `);
}

/**
 * 主入口
 */
export async function runDatabaseInit(args = process.argv.slice(2)) {
  const flags = parseInitArgs(args);

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
      throw new Error("Environment file was not found");
    }
  }

  if (flags.isNode) {
    await runDrizzleInit();
    const { initDatabase } = await import("@hodor/core/db/init");

    console.log(
      "\n📦 正在同步数据库基础数据 (User, Role, Menu, Translation)..."
    );
    await initDatabase();
    console.log("✅ 数据库基础数据同步成功");
  }

  if (flags.isWorker) {
    const target = flags.isRemote ? "remote" : "local";
    if (flags.isMigration) {
      runWranglerMigrations(target);
    } else {
      await runWranglerInit(target);
    }
  }

  console.log("\n🎉 数据库 DDL 指令执行完毕！\n");
}

// 脚本执行
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  void runDatabaseInit().catch((err: unknown) => {
    console.error("🔥 数据库指令未完成:", getErrorMessage(err));
    process.exitCode = 1;
  });
}
