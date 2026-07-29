import db from "@hodor/core/db/index";
import { sql } from "drizzle-orm";
import { baseSysLogTable, baseBizLogTable } from "@hodor/admin/base/log/model";
import userTable from "@hodor/admin/system/user/model";

type OldLoginLog = {
  user_id: number;
  login_time_utc: number;
  ip: string;
  user_agent: string;
  remark: string | null;
  creator_id: number;
  create_time_utc: number;
};

type OldMailLog = {
  mail_to: string;
  mail_from: string;
  title: string;
  template_id: string;
  template_params: string;
  send_status: number;
  exception_code: string | null;
  exception_details: string | null;
  remark: string | null;
  creator_id: number;
  create_time_utc: number;
};

async function main() {
  console.log("Starting log migration...");

  // 1. 获取所有用户映射以便填充 creatorName
  console.log("Fetching users...");
  const users = await db
    .select({ id: userTable.id, username: userTable.username })
    .from(userTable);
  const userMap = new Map(users.map((u) => [u.id, u.username]));
  const getCreatorName = (userId: number) =>
    userMap.get(userId) || String(userId);

  // 2. 迁移 login_log
  console.log(
    "Migrating login logs (maintenance_audit_login -> base_sys_log)..."
  );
  try {
    const oldLoginLogs = await db.all(
      sql`SELECT * FROM maintenance_audit_login`
    );
    console.log(`Found ${oldLoginLogs.length} login logs.`);

    if (oldLoginLogs.length > 0) {
      const sysLogValues = (oldLoginLogs as OldLoginLog[]).map((log) => ({
        namespace: "login",
        logLevel: "INFO",
        payloadType: "json",
        logValue: JSON.stringify({
          userId: log.user_id,
          loginTimeUtc: log.login_time_utc,
          ip: log.ip,
          userAgent: log.user_agent,
        }),
        remark: log.remark,
        creatorId: log.creator_id,
        creatorName: getCreatorName(log.creator_id),
        createTimeUtc: log.create_time_utc,
      }));

      // Insert in chunks to avoid SQLite limits
      const chunkSize = 100;
      for (let i = 0; i < sysLogValues.length; i += chunkSize) {
        const chunk = sysLogValues.slice(i, i + chunkSize);
        await db.insert(baseSysLogTable).values(chunk);
      }
      console.log(`Successfully migrated ${sysLogValues.length} login logs.`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("no such table")) {
      console.log("maintenance_audit_login table does not exist, skipping.");
    } else {
      console.error("Error migrating login logs:", error);
    }
  }

  // 3. 迁移 mail_log
  console.log("Migrating mail logs (mail_log -> base_biz_log)...");
  try {
    const oldMailLogs = await db.all(sql`SELECT * FROM mail_log`);
    console.log(`Found ${oldMailLogs.length} mail logs.`);

    if (oldMailLogs.length > 0) {
      const bizLogValues = (oldMailLogs as OldMailLog[]).map((log) => ({
        namespace: "mail",
        status: log.exception_code ? 0 : 1,
        payloadType: "json",
        logValue: JSON.stringify({
          mailTo: log.mail_to,
          mailFrom: log.mail_from,
          title: log.title,
          templateId: log.template_id,
          templateParams: log.template_params,
          sendStatus: Boolean(log.send_status),
          exceptionCode: log.exception_code,
          exceptionDetails: log.exception_details,
        }),
        remark: log.remark,
        creatorId: log.creator_id,
        creatorName: getCreatorName(log.creator_id),
        createTimeUtc: log.create_time_utc,
      }));

      // Insert in chunks
      const chunkSize = 100;
      for (let i = 0; i < bizLogValues.length; i += chunkSize) {
        const chunk = bizLogValues.slice(i, i + chunkSize);
        await db.insert(baseBizLogTable).values(chunk);
      }
      console.log(`Successfully migrated ${bizLogValues.length} mail logs.`);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("no such table")) {
      console.log("mail_log table does not exist, skipping.");
    } else {
      console.error("Error migrating mail logs:", error);
    }
  }

  console.log("Migration completed. The old tables were NOT dropped.");
}

main().catch((err) => {
  console.error("Fatal error during migration:", err);
  process.exit(1);
});
