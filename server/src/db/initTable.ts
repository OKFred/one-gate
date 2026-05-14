import { baseTableInit } from "@/db/utils/schema";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * 所有需要初始化的数据库表名 (用于 Drizzle 引擎)
 */
const TABLES = [
  "system_user",
  "system_role",
  "system_permission",
  "system_role_permission",
  "system_menu",
  "system_department",
  "i18n_language",
  "i18n_region",
  "i18n_translation",
  "mail_account",
  "mail_template",
  "mail_log",
  "oss_config",
  "maintenance_audit_login",
  "maintenance_compliance",
  "enterprise_attendance",
  "ai_llm_config",
];

/**
 * [Node 模式] 使用 Drizzle 引擎初始化表结构
 * 适用于直接连接 SQLite 文件的场景 (如本地 Node 运行)
 */
export async function runDrizzleInit() {
  console.log("\n🏗️  正在通过 Drizzle 引擎同步本地 SQLite 表结构...");
  console.log("-------------------------------------------");
  for (const tableName of TABLES) {
    try {
      await baseTableInit(tableName);
      console.log(`✅ [Drizzle] ${tableName} 同步成功`);
    } catch (error) {
      console.error(`❌ [Drizzle] ${tableName} 同步失败:`, error);
    }
  }
}

/**
 * [Worker 模式] 使用 Wrangler/D1 引擎同步 SQL 文件
 * 遍历 src/db/sql 目录下的所有脚本并推送到 D1
 */
async function runWranglerInit(target: "local" | "remote") {
  const sqlDir = path.resolve(process.cwd(), "src/db/sql");
  if (!fs.existsSync(sqlDir)) {
    console.warn("⚠️  未找到 SQL 脚本目录:", sqlDir);
    return;
  }

  const files = fs
    .readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(
    `\n⚡ 正在通过 Wrangler 引擎同步 D1 (hodor_db) [${target}] 环境...`
  );
  console.log(`📂 发现 ${files.length} 个 SQL 脚本\n`);

  let successCount = 0;
  for (const file of files) {
    const filePath = path.join("src/db/sql", file);
    try {
      console.log(`📄 正在同步: ${file}...`);
      const targetFlag = target === "remote" ? "--remote" : "--local";
      execSync(
        `npx wrangler d1 execute hodor_db ${targetFlag} --file=${filePath} --yes`,
        {
          stdio: "inherit",
        }
      );
      successCount++;
    } catch (error: any) {
      console.error(`\n❌ [Wrangler] ${file} 同步失败:`, error.message);
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
  --env=<filename>   手动加载环境配置文件 (如 --env=.env.development)
  help               显示此帮助信息

示例:
  pnpm run db:init node
  pnpm run db:init node --env=.env.development
  pnpm run db:init worker
  pnpm run db:init worker remote
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
    await runDrizzleInit();
  }

  if (flags.isWorker) {
    const target = flags.isRemote ? "remote" : "local";
    await runWranglerInit(target);
  }

  console.log("\n🎉 数据库 DDL 指令执行完毕！\n");
}

// 脚本执行
main().catch((err) => {
  console.error("🔥 全局同步异常:", err);
  process.exit(1);
});
