import { sql } from "drizzle-orm";
import { type AppDatabase } from "@/db/index";

/**
 * 初始化测试数据库表结构
 * @param dbInstance 当前的 Drizzle database 实例
 * @param sqlContents 导入的 SQL 文本内容数组（可以使用 Vite 的 ?raw 导入）
 */
export async function setupTestDb(
  dbInstance: AppDatabase,
  sqlContents: string[]
) {
  for (const sqlContent of sqlContents) {
    // 将 SQL 脚本按照分号切分成单条语句执行（支持多行和注释处理）
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await dbInstance.run(sql.raw(stmt));
    }
  }
}

/**
 * 快速清空指定的表数据，用于在 afterEach 中重置测试用例数据
 * @param dbInstance 当前的 Drizzle database 实例
 * @param tableNames 需要清空的表名数组
 */
export async function clearTestData(
  dbInstance: AppDatabase,
  tableNames: string[]
) {
  for (const table of tableNames) {
    await dbInstance.run(sql.raw(`DELETE FROM \`${table}\``));
  }
}
