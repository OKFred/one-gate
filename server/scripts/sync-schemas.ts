/**
 * 系统 Schema 同步脚本
 *
 * 将后端 OpenAPI 注册的 schema 同步到 system_schema_form 数据库表。
 * 需要先初始化 app 以触发所有路由/schema 注册，再执行同步。
 *
 * 用法:
 *   pnpm run sync:schemas
 */

// 使用相对路径导入，避免 tsconfig rootDir 冲突
import createApp from "../apps/server/src/index.js";
import { syncSystemSchemas } from "../packages/infra/src/data/schema_form/sync.js";

async function main() {
  console.log("\n🔄 正在初始化应用以收集 Schema 注册信息...");

  // 创建 app 触发 encapsulation → registerSchema
  createApp();

  console.log("📦 Schema 收集完成，开始同步到数据库...\n");

  await syncSystemSchemas();

  console.log("\n🎉 Schema 同步完成！\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("🔥 Schema 同步失败:", err);
  process.exit(1);
});
