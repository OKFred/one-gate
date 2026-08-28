/**
 * 系统 Schema 同步脚本
 *
 * 将后端 OpenAPI 注册的 schema 同步到 D1 数据库中。
 * 支持同步到本地 D1 (--local) 或 远程生产 D1 (--remote)。
 *
 * 用法:
 *   pnpm run sync:schemas           (默认写入本地 D1)
 *   pnpm run sync:schemas --remote  (写入远程生产 D1)
 */

import fs from "node:fs";
import path from "node:path";
import createApp from "../apps/server/src/index.js";
import {
  InMemoryTotpAttemptCoordinator,
  createTotpGateCenter,
} from "../packages/admin/src/system/auth/totp-gate/index.js";
import {
  getAllSchemas,
  getVersionHash,
} from "../packages/core/src/utils/schemaRegistry.js";

async function main() {
  console.log("\n🔄 正在初始化应用以收集 Schema 注册信息...");

  // 创建 app 触发 encapsulation → registerSchema
  const totpCoordinator = new InMemoryTotpAttemptCoordinator();
  createApp({
    resolveTotpGateCenter: () => createTotpGateCenter(totpCoordinator),
  });

  const allSchemas = getAllSchemas();
  const schemaCount = allSchemas.size;

  if (schemaCount === 0) {
    console.log("⚠️ 未检测到已注册的系统 schema，同步跳过。");
    process.exit(0);
  }

  console.log(`📦 收集完成，共发现 ${schemaCount} 个系统 schema`);

  // 生成临时的 SQL 脚本内容
  const activeCodes: string[] = [];
  const sqlStatements: string[] = [];

  // 1. 生成 INSERT OR REPLACE 语句
  for (const [name, schema] of allSchemas) {
    activeCodes.push(name);
    const escapedName = name.replace(/'/g, "''");
    const schemaDataStr = JSON.stringify(schema);
    const escapedSchemaData = schemaDataStr.replace(/'/g, "''");

    sqlStatements.push(
      `INSERT OR REPLACE INTO system_schema_form (code, name, schema_data, source, is_enabled, creator_id, creator_name, create_time_utc) VALUES ('${escapedName}', '${escapedName}', '${escapedSchemaData}', 'system', 1, 0, 'System', ${Date.now()});`
    );
  }

  // 2. 生成清理过期 system schema 的语句
  if (activeCodes.length > 0) {
    const escapedCodes = activeCodes.map((code) => code.replace(/'/g, "''"));
    const codesInSql = `'${escapedCodes.join("', '")}'`;
    sqlStatements.push(
      `DELETE FROM system_schema_form WHERE source = 'system' AND code NOT IN (${codesInSql});`
    );
  }

  // 写入最终 SQL 文件到 scripts 同级或 server 根目录下
  const sqlFile = path.resolve(process.cwd(), "schemas.sql");
  fs.writeFileSync(sqlFile, sqlStatements.join("\n"), "utf8");

  const version = getVersionHash();
  console.log(`\n🎉 成功将 ${schemaCount} 个系统 Schema 生成并写入到：`);
  console.log(`👉 ${sqlFile}`);
  console.log(`\n==================================================`);
  console.log(`📊 当前 Schema 全局版本号: ${version}`);
  console.log(`==================================================`);

  // 判断是否开启自动分批执行导入
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote") || args.includes("remote");
  const isLocal = args.includes("--local") || args.includes("local");

  if (isRemote || isLocal) {
    const target = isRemote ? "remote" : "local";
    const targetFlag = isRemote ? "--remote" : "--local";
    console.log(
      `\n⚡ 检测到 D1 [${target}] 环境同步参数，开始分批次自动导入...`
    );
    console.log(
      `⚠️  D1 限制单次上传 SQL 语句大小，我们将以 30 条为一组进行分批推送。`
    );

    const BATCH_SIZE = 30;
    const totalBatches = Math.ceil(sqlStatements.length / BATCH_SIZE);
    const { execSync } = await import("node:child_process");

    for (let i = 0; i < totalBatches; i++) {
      const batchSqls = sqlStatements.slice(
        i * BATCH_SIZE,
        (i + 1) * BATCH_SIZE
      );
      const tempSqlFile = path.resolve(
        process.cwd(),
        `temp_schemas_batch_${i}.sql`
      );
      fs.writeFileSync(tempSqlFile, batchSqls.join("\n"), "utf8");

      try {
        console.log(
          `🚀 [批次 ${i + 1}/${totalBatches}] 正在推送 ${batchSqls.length} 条 Schema 语句...`
        );
        execSync(
          `npx wrangler d1 execute hodor_db ${targetFlag} --file=${tempSqlFile} --yes`,
          {
            stdio: "inherit",
            cwd: path.resolve(process.cwd(), "apps/server"),
          }
        );
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ [批次 ${i + 1}] 自动同步失败:`, errorMsg);
        console.log(`\n💡 [手动解决方案]：`);
        console.log(`   您可以手动将 ${tempSqlFile} 或总 sql 拆分后执行导入。`);
        if (fs.existsSync(tempSqlFile)) {
          fs.unlinkSync(tempSqlFile);
        }
        process.exit(1);
      } finally {
        if (fs.existsSync(tempSqlFile)) {
          fs.unlinkSync(tempSqlFile);
        }
      }
    }
    console.log(
      `\n🎉 D1 [${target}] ${schemaCount} 个 Schema 全部批次自动同步成功！\n`
    );
  } else {
    console.log(`\n💡 [导入指引] 您可以直接通过以下命令完成导入：`);
    console.log(`\n  - 本地 D1 数据库：`);
    console.log(
      "    npx wrangler d1 execute hodor_db --local --file=./schemas.sql --yes"
    );
    console.log(
      `\n  - 线上生产 D1 数据库 (若因大小限制报错，请带上 --remote 参数运行本脚本进行自动分批推送)：`
    );
    console.log("    pnpm run sync:schemas --remote");
    console.log(`\n==================================================\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("🔥 全局运行异常:", err);
  process.exit(1);
});
