import type { UserObj } from "@/types/app";

/**
 * 数据读取参数过滤器 - 根据用户权限过滤查询参数
 *
 * @description
 * 此函数用于在读取数据时，根据用户的权限级别自动过滤查询参数。
 * 主要用于关注点分离，让 service 层更纯粹，不需要关心权限相关的参数转换。
 *
 * @template T - 查询参数的类型
 * @param params - 原始查询参数
 * @param userObj - 可选的用户对象，如果不传入则不进行过滤
 * @returns 过滤后的查询参数
 *
 * @example
 * ```typescript
 * // 在 service 中使用
 * async function onListAll(
 *   params: FromSchema<typeof listAllReq>,
 *   userObj?: UserObj
 * ): Promise<FromSchema<typeof listAllRes>> {
 *   const effectiveParams = filterParams(params, userObj);
 *   // 使用 effectiveParams 进行查询
 * }
 * ```
 *
 * @remarks
 * - 超级管理员不会被过滤，直接返回原始参数
 * - 非超级管理员会被强制添加 isEnabled: true 过滤条件
 * - 如果不传入 userObj，则直接返回原始参数（用于测试或特殊场景）
 * - 可以通过泛型扩展到其他模块复用（如用户、角色等）
 */
export function filterParams<T extends Record<string, any>>(
  params: T,
  userObj?: UserObj
): T {
  // 如果没有传入 userObj，直接返回原始参数
  if (!userObj) {
    return params;
  }

  // 超级管理员不过滤
  if (userObj.isSuperAdmin) {
    return params;
  }

  // 非超级管理员强制只能访问已启用的数据
  return {
    ...params,
    isEnabled: true,
  } as T;
}

/**
 * 数据读取参数过滤器工厂 - 创建带自定义过滤规则的过滤器
 *
 * @description
 * 用于创建更复杂的过滤规则，支持自定义的权限过滤逻辑
 *
 * @template T - 查询参数的类型
 * @param filterRules - 自定义过滤规则函数
 * @returns 过滤函数
 *
 * @example
 * ```typescript
 * // 创建自定义过滤器
 * const myFilter = createFilterParams<MyParams>((params, userObj) => {
 *   if (!userObj || userObj.isSuperAdmin) return params;
 *   return {
 *     ...params,
 *     isEnabled: true,
 *     departmentId: userObj.departmentObj?.value
 *   };
 * });
 *
 * // 使用
 * const filtered = myFilter(params, userObj);
 * ```
 */
export function createFilterParams<T extends Record<string, any>>(
  filterRules: (params: T, userObj?: UserObj) => T
) {
  return (params: T, userObj?: UserObj): T => {
    return filterRules(params, userObj);
  };
}
