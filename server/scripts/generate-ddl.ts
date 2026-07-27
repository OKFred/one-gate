import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const tempDir = path.resolve(projectRoot, "temp-migrations");
const outputBaseDir = path.resolve(projectRoot, "packages/core/src/db/sql");
const migrationDir = path.resolve(
  projectRoot,
  "packages/core/src/db/migrations"
);

function cleanDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parseSqlStatements(sqlContent: string): Record<string, string[]> {
  const rawParts = sqlContent.split(/-->\s*statement-breakpoint/i);
  const statements: string[] = [];

  for (const part of rawParts) {
    const subParts = part
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    statements.push(...subParts);
  }

  const tableSqls: Record<string, string[]> = {};

  for (const statement of statements) {
    let stmt = statement.trim();
    if (!stmt) {
      continue;
    }

    if (!stmt.endsWith(";")) {
      stmt += ";";
    }

    // 自动为 CREATE TABLE 和 CREATE [UNIQUE] INDEX 添加 IF NOT EXISTS
    stmt = stmt.replace(
      /^create\s+table\s+(?!if\s+not\s+exists\s+)/i,
      "CREATE TABLE IF NOT EXISTS "
    );
    stmt = stmt.replace(
      /^create\s+(unique\s+)?index\s+(?!if\s+not\s+exists\s+)/i,
      (_, isUnique) =>
        isUnique
          ? "CREATE UNIQUE INDEX IF NOT EXISTS "
          : "CREATE INDEX IF NOT EXISTS "
    );

    let tableName: string | null = null;

    const createTableMatch = stmt.match(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:["`]?)([^"`\s()]+)(?:["`]?)/i
    );
    if (createTableMatch) {
      tableName = createTableMatch[1];
    } else {
      const createIndexMatch = stmt.match(
        /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(?:["`]?)[^"`\s]+(?:["`]?)\s+on\s+(?:["`]?)([^"`\s()]+)(?:["`]?)/i
      );
      if (createIndexMatch) {
        tableName = createIndexMatch[1];
      }
    }

    if (tableName) {
      if (!tableSqls[tableName]) {
        tableSqls[tableName] = [];
      }
      tableSqls[tableName].push(stmt);
    }
  }

  return tableSqls;
}

// 增量模式逻辑
function runMigrationMode() {
  const schemaPath = "./packages/**/model.ts";

  if (!fs.existsSync(migrationDir)) {
    fs.mkdirSync(migrationDir, { recursive: true });
  }

  console.log(`\n⏳ 正在生成增量迁移 SQL (输出至 core/src/db/migrations)...`);
  try {
    execSync(
      `pnpm exec drizzle-kit generate --dialect=sqlite --schema=${schemaPath} --out=./packages/core/src/db/migrations`,
      {
        stdio: "inherit",
        cwd: projectRoot,
      }
    );
    console.log(`\n🎉 增量迁移 SQL 生成成功！`);
  } catch (err) {
    console.error("❌ 增量迁移生成失败:", err);
  }
}

// 全量模式逻辑 (原逻辑)
function runFullMode() {
  console.log("🚀 开始通过 drizzle-kit 从 schema 生成并归类 SQL DDL 文件...");

  cleanDir(tempDir);

  // 每次如果输出全量，清空增量 migrations 目录
  if (fs.existsSync(migrationDir)) {
    console.log("🧹 检测到全量输出，正在清空增量 migrations 目录...");
    cleanDir(migrationDir);
  }

  const domains = ["enterprise", "admin", "personal"];

  for (const domain of domains) {
    const destDir = path.join(outputBaseDir, domain);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
  }

  try {
    for (const domain of domains) {
      console.log(`\n⏳ [领域: ${domain}] 正在生成 schema 迁移...`);
      const schemaPath = `./packages/${domain}/**/model.ts`;
      const outPath = `./temp-migrations/${domain}`;

      try {
        execSync(
          `pnpm exec drizzle-kit generate --dialect=sqlite --schema=${schemaPath} --out=${outPath}`,
          {
            stdio: "inherit",
            cwd: projectRoot,
          }
        );

        const migrationsDir = path.resolve(tempDir, domain);
        if (!fs.existsSync(migrationsDir)) {
          console.log(
            `⚠️  [领域: ${domain}] 没有检测到生成的迁移文件，可能是没有定义 schema。`
          );
          continue;
        }

        const sqlFiles = fs
          .readdirSync(migrationsDir)
          .filter((f) => f.endsWith(".sql"));

        for (const sqlFile of sqlFiles) {
          const fullSqlPath = path.join(migrationsDir, sqlFile);
          const sqlContent = fs.readFileSync(fullSqlPath, "utf8");
          const tableSqlMap = parseSqlStatements(sqlContent);

          for (const [tableName, sqlLines] of Object.entries(tableSqlMap)) {
            const destFilePath = path.join(
              outputBaseDir,
              domain,
              `${tableName}.sql`
            );
            fs.writeFileSync(
              destFilePath,
              sqlLines.join("\n\n") + "\n",
              "utf8"
            );
            console.log(`📝 已输出并归类: ${domain}/${tableName}.sql`);
          }
        }
      } catch (err) {
        console.error(`❌ [领域: ${domain}] 迁移生成失败:`, err);
      }
    }
  } finally {
    cleanDir(tempDir);
  }

  console.log("\n🎉 全量 SQL DDL 生成与归类整理已全部完成！\n");
}

async function main() {
  // 解析可选参数：检测是否为增量迁移模式
  const args = process.argv.slice(2);
  const isMigration =
    args.includes("--migration") ||
    args.includes("migration") ||
    args.includes("--incremental") ||
    args.includes("incremental");

  if (isMigration) {
    runMigrationMode();
  } else {
    runFullMode();
  }
}

main().catch((err) => {
  console.error("🔥 运行异常:", err);
  process.exit(1);
});
