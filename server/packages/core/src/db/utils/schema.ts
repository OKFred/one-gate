import db from "@hodor/core/db/index";

/**
 * 通用的数据库表初始化函数
 * 该函数通过读取指定的 SQL 文件并逐条执行 SQL 语句来初始化数据库表。
 * 采用了动态导入以确保非 Node 运行环境（如 Cloudflare Workers）的兼容性。
 *
 * @param tableName 表名称，用于日志输出
 * @param sqlFileName 可选：SQL 文件名（不含扩展名），如果与 tableName 不同则需指定
 */
export async function baseTableInit(tableName: string, sqlFileName?: string) {
  try {
    // 动态导入 node:fs, node:path, node:url 确保在非 Node.js 环境（如 Worker）不报错
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    // 获取当前文件所在目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 定位 SQL 目录（当前文件在 src/db/utils/，SQL 在 src/db/sql/）
    const sqlDir = path.resolve(__dirname, "../sql");

    // 递归寻找对应的 sql 文件
    const findSqlFile = (dir: string, targetName: string): string | null => {
      if (!fs.existsSync(dir)) return null;
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          const found = findSqlFile(filePath, targetName);
          if (found) return found;
        } else if (file === `${targetName}.sql`) {
          return filePath;
        }
      }
      return null;
    };

    const sqlPath = findSqlFile(sqlDir, sqlFileName || tableName);

    if (!sqlPath || !fs.existsSync(sqlPath)) {
      console.warn(`⚠️ 未发现 SQL 文件 for table: ${tableName}`);
      return;
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    // 按分号拆分 SQL 语句，并过滤空行
    const sqlStatements = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of sqlStatements) {
      await db.run(statement);
    }
    console.log(`💾 表 ${tableName} 已初始化`);
  } catch (err: any) {
    // 如果是因为模块找不到（通常在 Worker 运行时触发），则静默跳过
    if (err.code === "ERR_MODULE_NOT_FOUND" || typeof process === "undefined") {
      return;
    }
    console.error(`❌ 初始化表 ${tableName} 失败:`, err);
  }
}
