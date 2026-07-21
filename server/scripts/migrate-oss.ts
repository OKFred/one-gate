/**
 * OSS 配置数据迁移脚本
 *
 * 将旧的 `oss_config` 表中的数据迁移至 `base_sys_config` 表中 (namespace = 'oss')
 * 采用覆盖模式：已存在的 config_key 会被更新，不存在的会被插入。
 *
 * 用法:
 *   pnpm run migrate:oss           (默认写入本地 D1)
 *   pnpm run migrate:oss --remote  (写入远程生产 D1)
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote") || args.includes("remote");
  const targetFlag = isRemote ? "--remote" : "--local";

  console.log(`\n🔄 开始生成迁移 SQL 语句...`);

  const sqlStatements = [
    `-- 1. 更新已存在的记录`,
    `UPDATE base_sys_config 
     SET 
       is_enabled = (SELECT is_enabled FROM oss_config WHERE name = base_sys_config.config_key),
       is_primary = (SELECT is_default FROM oss_config WHERE name = base_sys_config.config_key),
       config_value = (SELECT json_object(
         'provider', provider,
         'endpoint', endpoint,
         'accountId', account_id,
         'accessKey', access_key,
         'secretKey', secret_key,
         'bucket', bucket,
         'region', region
       ) FROM oss_config WHERE name = base_sys_config.config_key),
       remark = (SELECT remark FROM oss_config WHERE name = base_sys_config.config_key),
       updater_id = (SELECT updater_id FROM oss_config WHERE name = base_sys_config.config_key),
       update_time_utc = (SELECT update_time_utc FROM oss_config WHERE name = base_sys_config.config_key)
     WHERE namespace = 'oss' AND config_key IN (SELECT name FROM oss_config);`,

    `-- 2. 插入不存在的记录`,
    `INSERT INTO base_sys_config (
       namespace, config_key, is_enabled, is_primary, config_value, 
       remark, creator_id, updater_id, create_time_utc, update_time_utc
     )
     SELECT 
       'oss', name, is_enabled, is_default,
       json_object(
         'provider', provider,
         'endpoint', endpoint,
         'accountId', account_id,
         'accessKey', access_key,
         'secretKey', secret_key,
         'bucket', bucket,
         'region', region
       ),
       remark, creator_id, updater_id, create_time_utc, update_time_utc
     FROM oss_config
     WHERE name NOT IN (SELECT config_key FROM base_sys_config WHERE namespace = 'oss');`,
  ];

  const tempSqlFile = path.resolve(process.cwd(), "temp_migrate_oss.sql");
  fs.writeFileSync(tempSqlFile, sqlStatements.join("\n\n"), "utf8");

  try {
    console.log(
      `🚀 正在推送迁移脚本到 D1 [${isRemote ? "remote" : "local"}] 环境...`
    );
    execSync(
      `npx wrangler d1 execute hodor_db ${targetFlag} --file=${tempSqlFile} --yes`,
      {
        stdio: "inherit",
        cwd: path.resolve(process.cwd(), "apps/server"),
      }
    );
    console.log(`\n🎉 迁移成功完成！\n`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ 迁移失败:`, errorMsg);
  } finally {
    if (fs.existsSync(tempSqlFile)) {
      fs.unlinkSync(tempSqlFile);
    }
  }
}

main().catch((err) => {
  console.error("🔥 全局运行异常:", err);
  process.exit(1);
});
