/**
 * 操作守卫 - 用于在写操作前进行业务规则验证
 *
 * @description
 * 提供一套标准化的业务规则验证机制，用于在执行增删改操作前检查是否满足业务条件。
 * 支持同步和异步的验证规则，验证失败时自动抛出错误。
 */

import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";

/**
 * 验证规则类型
 */
export interface ValidationRule {
  /** 规则名称，用于调试和错误信息 */
  name: string;
  /** 验证函数：返回 true 表示通过，false 表示失败 */
  validate: () => boolean | Promise<boolean>;
  /** 验证失败时的错误码 */
  errorCode: BusinessErrorCode;
  /** 验证失败时的元数据（可选） */
  errorMeta?: Record<string, any>;
}

/**
 * 操作守卫 - 执行一组验证规则
 *
 * @description
 * 按顺序执行所有验证规则，遇到第一个失败的规则时立即抛出错误。
 *
 * @param rules - 验证规则数组
 * @throws {BusinessError} 当任一规则验证失败时抛出
 *
 * @example
 * ```typescript
 * // 基础用法
 * await guardOperation([
 *   {
 *     name: "检查是否有子部门",
 *     validate: async () => {
 *       const children = await getChildrenCount(departmentId);
 *       return children === 0;
 *     },
 *     errorCode: BusinessErrorCode.HAS_CHILDREN,
 *     errorMessage: "该部门下存在子部门，无法删除"
 *   },
 *   {
 *     name: "检查是否有在职员工",
 *     validate: async () => {
 *       const count = await getEmployeeCount(departmentId);
 *       return count === 0;
 *     },
 *     errorCode: BusinessErrorCode.DEPARTMENT_HAS_ENABLED_USER
 *   }
 * ]);
 * ```
 */
export async function guardOperation(rules: ValidationRule[]): Promise<void> {
  for (const rule of rules) {
    try {
      const passed = await rule.validate();
      if (!passed) {
        throw new BusinessError(
          rule.errorCode,
          rule.errorMeta || { rule: rule.name }
        );
      }
    } catch (error) {
      // 如果已经是 BusinessError，直接抛出
      if (error instanceof BusinessError) {
        throw error;
      }
      // 其他错误，包装后抛出
      console.error(`[guardOperation] 规则 "${rule.name}" 执行失败:`, error);
      throw new BusinessError(
        rule.errorCode,
        rule.errorMeta || { rule: rule.name, error: String(error) }
      );
    }
  }
}

/**
 * 创建操作守卫工厂
 *
 * @description
 * 预配置一组验证规则，便于在多处复用
 *
 * @param rules - 验证规则数组或规则生成函数
 * @returns 返回一个函数，调用时执行验证
 *
 * @example
 * ```typescript
 * // 创建部门删除守卫
 * const guardDepartmentDeletion = createOperationGuard((departmentId: number) => [
 *   {
 *     name: "检查子部门",
 *     validate: async () => (await getChildrenCount(departmentId)) === 0,
 *     errorCode: BusinessErrorCode.HAS_CHILDREN
 *   },
 *   {
 *     name: "检查员工",
 *     validate: async () => (await getEmployeeCount(departmentId)) === 0,
 *     errorCode: BusinessErrorCode.DEPARTMENT_HAS_ENABLED_USER
 *   }
 * ]);
 *
 * // 使用
 * await guardDepartmentDeletion(123);
 * ```
 */
export function createOperationGuard<T extends any[]>(
  rulesOrFactory: ValidationRule[] | ((...args: T) => ValidationRule[])
) {
  if (Array.isArray(rulesOrFactory)) {
    // 静态规则
    return () => guardOperation(rulesOrFactory);
  } else {
    // 动态规则
    return (...args: T) => guardOperation(rulesOrFactory(...args));
  }
}

/**
 * 条件守卫 - 只在满足条件时执行验证
 *
 * @description
 * 提供条件判断能力，只有当条件满足时才执行后续验证规则
 *
 * @param condition - 条件判断函数
 * @param rules - 条件满足时要执行的验证规则
 * @returns 验证规则（可用于 guardOperation）
 *
 * @example
 * ```typescript
 * await guardOperation([
 *   conditionalGuard(
 *     () => isDisabling, // 只在禁用操作时检查
 *     [
 *       {
 *         name: "检查是否可以禁用",
 *         validate: async () => canDisable(id),
 *         errorCode: BusinessErrorCode.CANNOT_DISABLE
 *       }
 *     ]
 *   )
 * ]);
 * ```
 */
export function conditionalGuard(
  condition: () => boolean | Promise<boolean>,
  rules: ValidationRule[]
): ValidationRule {
  return {
    name: `条件守卫 (${rules.length} 个规则)`,
    validate: async () => {
      const shouldValidate = await condition();
      if (!shouldValidate) {
        return true; // 条件不满足，跳过验证
      }
      // 条件满足，执行所有子规则
      await guardOperation(rules);
      return true;
    },
    errorCode: BusinessErrorCode.INVALID_PARAMS, // 默认错误码（通常不会用到）
  };
}

/**
 * 通用验证规则构建器
 */
export const Guards = {
  /**
   * 检查资源是否存在
   */
  exists: <T>(
    name: string,
    fetcher: () => Promise<T | null | undefined>,
    errorCode: BusinessErrorCode = BusinessErrorCode.NOT_EXIST_OR_DISABLED
  ): ValidationRule => ({
    name: `检查${name}是否存在`,
    validate: async () => {
      const resource = await fetcher();
      return resource !== null && resource !== undefined;
    },
    errorCode,
  }),

  /**
   * 检查资源是否不存在（用于创建前检查唯一性）
   */
  notExists: <T>(
    name: string,
    fetcher: () => Promise<T | null | undefined>,
    errorCode: BusinessErrorCode = BusinessErrorCode.INVALID_PARAMS
  ): ValidationRule => ({
    name: `检查${name}是否不存在`,
    validate: async () => {
      const resource = await fetcher();
      return resource === null || resource === undefined;
    },
    errorCode,
  }),

  /**
   * 检查计数是否为0
   */
  countIsZero: (
    name: string,
    counter: () => Promise<number>,
    errorCode: BusinessErrorCode
  ): ValidationRule => ({
    name: `检查${name}数量是否为0`,
    validate: async () => {
      const count = await counter();
      return count === 0;
    },
    errorCode,
  }),

  /**
   * 检查布尔条件（通用）
   *
   * @description
   * 最通用的验证守卫，可用于任何返回布尔值的检查。
   *
   * @example
   * ```typescript
   * Guards.condition(
   *   "检查父部门循环引用",
   *   () => parentId !== currentId,
   *   BusinessErrorCode.INVALID_PARAMS,
   *   { reason: "不能将自己设为父部门" }
   * )
   * ```
   */
  condition: (
    name: string,
    checker: () => boolean | Promise<boolean>,
    errorCode: BusinessErrorCode,
    errorMeta?: Record<string, any>
  ): ValidationRule => ({
    name,
    validate: checker,
    errorCode,
    errorMeta,
  }),
};
