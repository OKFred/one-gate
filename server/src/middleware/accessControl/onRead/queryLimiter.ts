import type { SQL } from "drizzle-orm";

/**
 * 查询限制器规则组类型
 */
export interface QueryLimiterGroup {
  /** 规则组名称，用于调试和日志 */
  name: string;
  /** 该规则组内的条件组合方式（and/or 等） */
  operator: (...conditions: (SQL | undefined)[]) => SQL | undefined;
  /** 限制条件函数数组 */
  limiters: (() => SQL | undefined | Promise<SQL | undefined>)[];
}

/**
 * 查询限制器 - 动态组合 SQL 查询条件
 *
 * @description
 * 用于统一处理数据库查询层面的条件限制，支持灵活的条件组合。
 * 主要用于权限控制场景，根据用户权限动态添加查询限制条件。
 *
 * @param operator - 顶层的条件组合方式（如 and、or）
 * @param groups - 规则组数组，每个规则组包含名称、组内组合方式和限制条件函数数组
 * @returns 组合后的 SQL 条件，如果没有有效条件则返回 undefined
 *
 * @example
 * ```typescript
 * import { and, or, eq } from "drizzle-orm";
 *
 * // 示例 1: 基础查询 + 权限限制
 * const condition = await limitQuery(
 *   and,
 *   {
 *     name: "基础条件",
 *     operator: and,
 *     limiters: [
 *       () => eq(departmentTable.id, id)
 *     ]
 *   },
 *   {
 *     name: "权限限制",
 *     operator: and,
 *     limiters: [
 *       () => eq(departmentTable.isEnabled, true)
 *     ]
 *   }
 * );
 *
 * // 示例 2: 复杂的权限组合
 * const condition = await limitQuery(
 *   and,
 *   {
 *     name: "基础条件",
 *     operator: and,
 *     limiters: [() => eq(userTable.id, userId)]
 *   },
 *   {
 *     name: "读取权限",
 *     operator: or, // 满足任一条件即可
 *     limiters: [
 *       () => eq(userTable.isPublic, true),
 *       () => eq(userTable.creatorId, currentUserId),
 *       async () => {
 *         const deptIds = await getUserDepartmentIds(currentUserId);
 *         return inArray(userTable.departmentId, deptIds);
 *       }
 *     ]
 *   }
 * );
 * ```
 *
 * @remarks
 * - 支持同步和异步的 limiter 函数
 * - 自动过滤掉返回 undefined 的条件
 * - 如果规则组内所有条件都是 undefined，该规则组会被忽略
 * - 如果所有规则组都被忽略，返回 undefined
 */
export async function limitQuery(
  operator: (...conditions: (SQL | undefined)[]) => SQL | undefined,
  ...groups: QueryLimiterGroup[]
): Promise<SQL | undefined> {
  // 存储每个规则组的最终条件
  const groupConditions: (SQL | undefined)[] = [];

  // 处理每个规则组
  for (const group of groups) {
    const { name, operator: groupOperator, limiters } = group;

    if (!limiters || limiters.length === 0) {
      continue;
    }

    // 执行该组内所有的 limiter 函数
    const conditions: (SQL | undefined)[] = [];
    for (const [index, limiter] of limiters.entries()) {
      const limiterLabel = `${index + 1}/${limiters.length}`;
      try {
        const condition = await limiter();
        if (condition !== undefined) {
          conditions.push(condition);
          console.log(
            `[limitQuery] 规则组 "${name}" 的 limiter (${limiterLabel}) 结果: 生效`
          );
        } else {
          console.log(
            `[limitQuery] 规则组 "${name}" 的 limiter (${limiterLabel}) 结果: 跳过`
          );
        }
      } catch (error) {
        console.error(
          `[limitQuery] 规则组 "${name}" 的 limiter (${limiterLabel}) 执行失败:`,
          error
        );
        // 继续执行其他 limiter
      }
    }

    // 如果该组有有效条件，使用组内 operator 组合
    if (conditions.length > 0) {
      if (conditions.length === 1) {
        groupConditions.push(conditions[0]);
      } else {
        const groupCondition = groupOperator(...conditions);
        if (groupCondition !== undefined) {
          groupConditions.push(groupCondition);
        }
      }
    }
  }

  // 使用顶层 operator 组合所有规则组
  if (groupConditions.length === 0) {
    return undefined;
  }

  if (groupConditions.length === 1) {
    return groupConditions[0];
  }

  return operator(...groupConditions);
}

/**
 * 创建查询限制器工厂函数
 *
 * @description
 * 用于创建预配置的查询限制器，便于在多处复用相同的限制规则
 *
 * @param operator - 顶层的条件组合方式
 * @param groups - 规则组数组
 * @returns 返回一个函数，调用时执行查询限制逻辑
 *
 * @example
 * ```typescript
 * // 创建部门数据读取限制器
 * const departmentReadLimiter = createQueryLimiter(
 *   and,
 *   {
 *     name: "启用状态限制",
 *     operator: and,
 *     limiters: [
 *       () => eq(departmentTable.isEnabled, true)
 *     ]
 *   }
 * );
 *
 * // 使用
 * const condition = await departmentReadLimiter();
 * const rows = await db.select().from(departmentTable).where(condition);
 * ```
 */
export function createQueryLimiter(
  operator: (...conditions: (SQL | undefined)[]) => SQL | undefined,
  ...groups: QueryLimiterGroup[]
) {
  return () => limitQuery(operator, ...groups);
}
