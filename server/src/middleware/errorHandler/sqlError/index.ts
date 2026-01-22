import { BusinessError, BusinessErrorCode } from "../businessError";

export function convertSqlErrorToBusinessError(e: Error): BusinessError | null {
  const errorMessage = e.message || "";
  const errorName = e.name || "";

  // SQLite 唯一约束冲突
  if (
    errorMessage.includes("SQLITE_CONSTRAINT_UNIQUE") ||
    errorMessage.includes("UNIQUE constraint failed")
  ) {
    return new BusinessError(BusinessErrorCode.DUPLICATE_DATA);
  }

  // 数据库锁定
  if (
    errorMessage.includes("SQLITE_BUSY") ||
    errorMessage.includes("database is locked")
  ) {
    return new BusinessError(BusinessErrorCode.DATABASE_BUSY);
  }

  // Drizzle ORM 特定错误
  if (errorName === "DrizzleError") {
    return new BusinessError(BusinessErrorCode.DATABASE_ERROR);
  }

  // 通用SQLite错误检测
  if (
    errorMessage.includes("SQLITE_") ||
    errorName.includes("SqliteError") ||
    errorName.includes("DatabaseError")
  ) {
    return new BusinessError(BusinessErrorCode.DATABASE_ERROR);
  }

  // 不是SQL错误，返回null让其他错误处理器处理
  return null;
}
