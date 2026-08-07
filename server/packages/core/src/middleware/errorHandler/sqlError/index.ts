import { BusinessError, BusinessErrorCode } from "../businessError";

export function convertSqlErrorToBusinessError(e: Error): BusinessError | null {
  const errorCause = String(e.cause || "");
  const errorName = e.name || "";
  const errorMessage = e.message || "";
  const fullErrorStr = `${errorName} ${errorMessage} ${errorCause}`;

  if (!fullErrorStr.trim()) {
    return null;
  }

  // SQLite 唯一约束冲突
  if (
    fullErrorStr.includes("SQLITE_CONSTRAINT_UNIQUE") ||
    fullErrorStr.includes("UNIQUE constraint failed")
  ) {
    return new BusinessError(BusinessErrorCode.DUPLICATE_DATA);
  }

  // 数据库锁定
  if (
    fullErrorStr.includes("SQLITE_BUSY") ||
    fullErrorStr.includes("database is locked")
  ) {
    return new BusinessError(BusinessErrorCode.DATABASE_BUSY);
  }

  // Drizzle ORM 特定错误或通用 SQLite 错误检测
  if (
    errorName === "DrizzleError" ||
    fullErrorStr.includes("SQLITE_") ||
    errorName.includes("SqliteError") ||
    errorName.includes("DatabaseError")
  ) {
    return new BusinessError(BusinessErrorCode.DATABASE_ERROR);
  }

  // 不是SQL错误，返回null让其他错误处理器处理
  return null;
}
