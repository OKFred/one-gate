/**
 * Log 数据迁移脚本
 *
 * 将旧的 `maintenance_audit_login` 表迁移至 `base_sys_log` (namespace = 'login')
 * 将旧的 `mail_log` 表迁移至 `base_biz_log` (namespace = 'mail')
 *
 * 用法:
 *   pnpm run migrate:log           (默认写入本地 D1)
 *   pnpm run migrate:log --remote  (写入远程生产 D1)
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote") || args.includes("remote");
  const targetFlag = isRemote ? "--remote" : "--local";

  console.log(`\n🔄 开始生成日志迁移 SQL 语句...`);

  const sqlStatements = [
    `-- 1. 迁移登录日志 (maintenance_audit_login -> base_sys_log)`,
    `INSERT INTO base_sys_log (
       namespace, log_level, payload_type, log_value,
       remark, creator_id, creator_name, create_time_utc
     )
     SELECT
       'login',
       'INFO',
       'json',
       json_object(
         'userId', user_id,
         'loginTimeUtc', login_time_utc,
         'ip', ip,
         'userAgent', user_agent
       ),
       remark,
       creator_id,
       COALESCE((SELECT username FROM system_user WHERE id = creator_id), CAST(creator_id AS TEXT)),
       create_time_utc
     FROM maintenance_audit_login;`,

    `-- 2. 迁移邮件日志 (mail_log -> base_biz_log)`,
    `INSERT INTO base_biz_log (
       namespace, status, payload_type, log_value,
       remark, creator_id, creator_name, create_time_utc
     )
     SELECT
       'mail',
       CASE WHEN exception_code IS NULL THEN 1 ELSE 0 END,
       'json',
       json_object(
         'mailTo', mail_to,
         'mailFrom', mail_from,
         'title', title,
         'templateId', template_id,
         'templateParams', template_params,
         'sendStatus', send_status,
         'exceptionCode', exception_code,
         'exceptionDetails', exception_details
       ),
       remark,
       creator_id,
       COALESCE((SELECT username FROM system_user WHERE id = creator_id), CAST(creator_id AS TEXT)),
       create_time_utc
     FROM mail_log;`,
  ];

  const tempSqlFile = path.resolve(process.cwd(), "temp_migrate_log.sql");
  fs.writeFileSync(tempSqlFile, sqlStatements.join("\n\n"), "utf8");

  try {
    console.log(
      `🚀 正在推送日志迁移脚本到 D1 [${isRemote ? "remote" : "local"}] 环境...`
    );
    execSync(
      `npx wrangler d1 execute hodor_db ${targetFlag} --file=${tempSqlFile} --yes`,
      {
        stdio: "inherit",
        cwd: path.resolve(process.cwd(), "apps/server"),
      }
    );
    console.log(`\n🎉 日志迁移成功完成！\n`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ 日志迁移失败:`, errorMsg);
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
