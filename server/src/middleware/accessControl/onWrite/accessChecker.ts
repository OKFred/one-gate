import type { SQL } from "drizzle-orm";
import type { UserObj } from "@/types/app";
import { limitQuery, type QueryLimiterGroup } from "../onRead/queryLimiter";
import { and, eq } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core/table";

/**
 * 访问权限检查器配置
 */
export interface AccessCheckerConfig<T = any> {
  /** 资源表对象 */
  table: T;
  /** 资源 ID 字段（可选） */
  idField?: any;
  /** 是否启用字段（可选） */
  enabledField?: any;
  /** 自定义权限规则组（可选） */
  customRules?: (userObj: UserObj, resourceId: number) => QueryLimiterGroup[];
}

/**
 * 访问权限检查器 - 用于检查用户是否有权限访问某个资源
 *
 * @description
 * 用于写操作（update/delete）前检查用户是否有权限访问目标资源。
 * 支持超级管理员绕过检查，普通用户需要满足额外的权限条件（如只能访问已启用的数据）。
 *
 * @template T - 表对象类型
 * @param config - 访问检查器配置
 * @param userObj - 用户对象
 * @param resourceId - 资源 ID
 * @returns SQL 查询条件
 *
 * @example
 * ```typescript
 * // 基础用法 - 只检查 ID 和启用状态
 * const condition = await checkAccess(
 *   departmentId,
 *   {
 *     table: departmentTable,
 *     idField: departmentTable.id,
 *     enabledField: departmentTable.isEnabled
 *   },
 *   userObj,
 * );
 *
 * // 高级用法 - 添加自定义权限规则
 * const condition = await checkAccess(
 *   departmentId,
 *   {
 *     table: departmentTable,
 *     idField: departmentTable.id,
 *     enabledField: departmentTable.isEnabled,
 *     customRules: (userObj, resourceId) => [
 *       {
 *         name: "部门管理权限",
 *         operator: or,
 *         limiters: [
 *           () => eq(departmentTable.creatorId, userObj.userId),
 *           async () => {
 *             const isManager = await isUserDepartmentManager(userObj.userId, resourceId);
 *             return isManager ? undefined : eq(departmentTable.id, -1); // 不匹配
 *           }
 *         ]
 *       }
 *     ]
 *   },
 *   userObj,
 * );
 * ```
 */

export async function checkAccess<T extends SQLiteTable>(
  resourceId: number,
  config: AccessCheckerConfig<T>,
  userObj: UserObj
): Promise<SQL | undefined> {
  const {
    table,
    idField = table["id"],
    enabledField = table["isEnabled"],
    customRules,
  } = config;

  // 构建规则组
  const groups: QueryLimiterGroup[] = [
    {
      name: "资源ID匹配",
      operator: and,
      limiters: [() => eq(idField, resourceId)],
    },
  ];

  // 非超级管理员需要额外的权限检查
  if (!userObj.isSuperAdmin) {
    // 如果配置了启用字段，非超管只能访问已启用的资源
    if (enabledField) {
      groups.push({
        name: "启用状态限制",
        operator: and,
        limiters: [() => eq(enabledField, true)],
      });
    }

    // 添加自定义权限规则
    if (customRules) {
      const customGroups = customRules(userObj, resourceId);
      groups.push(...customGroups);
    }
  }

  return await limitQuery(and, ...groups);
}

/**
 * 创建访问权限检查器工厂
 *
 * @description
 * 预配置访问检查器，便于在多处复用相同的检查逻辑
 *
 * @template T - 表对象类型
 * @param config - 访问检查器配置
 * @returns 返回一个函数，调用时执行访问权限检查
 *
 * @example
 * ```typescript
 * // 创建部门访问检查器
 * const checkDepartmentAccess = createAccessChecker({
 *   table: departmentTable,
 *   idField: departmentTable.id,
 *   enabledField: departmentTable.isEnabled
 * });
 *
 * // 在 onUpdate 中使用
 * const condition = await checkDepartmentAccess(userObj, departmentId);
 * const rows = await db.select().from(departmentTable).where(condition);
 * ```
 */
export function createAccessChecker<T extends SQLiteTable>(
  config: AccessCheckerConfig<T>
) {
  return (resourceId: number, userObj: UserObj) =>
    checkAccess(resourceId, config, userObj);
}

/**
 * 批量访问权限检查配置
 */
export interface BatchAccessCheckerConfig<T = any>
  extends AccessCheckerConfig<T> {
  /** 批量 ID 匹配操作符（如 inArray） */
  batchMatcher: (field: any, ids: number[]) => SQL;
}

/**
 * 批量访问权限检查器
 *
 * @description
 * 用于检查用户是否有权限访问多个资源（批量删除等场景）
 *
 * @template T - 表对象类型
 * @param config - 批量访问检查器配置
 * @param userObj - 用户对象
 * @param resourceIds - 资源 ID 数组
 * @returns SQL 查询条件
 *
 * @example
 * ```typescript
 * import { inArray } from "drizzle-orm";
 *
 * const condition = await checkBatchAccess(
 *   {
 *     table: departmentTable,
 *     idField: departmentTable.id,
 *     enabledField: departmentTable.isEnabled,
 *     batchMatcher: (field, ids) => inArray(field, ids)
 *   },
 *   userObj,
 *   [1, 2, 3]
 * );
 * ```
 */
export async function checkBatchAccess<T>(
  config: BatchAccessCheckerConfig<T>,
  userObj: UserObj,
  resourceIds: number[]
): Promise<SQL | undefined> {
  const { table, idField, enabledField, batchMatcher, customRules } = config;

  if (resourceIds.length === 0) {
    return undefined;
  }

  const groups: QueryLimiterGroup[] = [
    {
      name: "资源ID匹配",
      operator: and,
      limiters: [() => batchMatcher(idField, resourceIds)],
    },
  ];

  if (!userObj.isSuperAdmin) {
    if (enabledField) {
      groups.push({
        name: "启用状态限制",
        operator: and,
        limiters: [() => eq(enabledField, true)],
      });
    }

    // 批量场景下，customRules 可能需要特殊处理
    // 这里简化处理，只传入第一个 ID
    if (customRules && resourceIds.length > 0) {
      const customGroups = customRules(userObj, resourceIds[0]);
      groups.push(...customGroups);
    }
  }

  return await limitQuery(and, ...groups);
}
