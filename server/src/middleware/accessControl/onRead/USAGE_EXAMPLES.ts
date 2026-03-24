/**
 * queryLimiter 使用示例
 *
 * queryLimiter 用于统一处理数据库查询层面的条件限制，特别适合处理权限相关的查询条件组合。
 */

import { and, or, eq, inArray } from "drizzle-orm";
import { limitQuery } from "@/middleware/accessControl/onRead/queryLimiter";
// import { departmentTable } from "@/api/system/department/db.table"; // 示例中的表引用
import type { UserObj } from "@/types/app";

// 为了示例的完整性，这里mock一个表对象
const departmentTable = {} as any;

// ============================================
// 示例 1: 简单的权限限制（替代 onGet 中的手动条件组合）
// ============================================

async function onGetExample(id: number, userObj?: UserObj) {
  const whereCondition = await limitQuery(
    and,
    {
      name: "基础查询条件",
      operator: and,
      limiters: [() => eq(departmentTable.id, id)],
    },
    {
      name: "权限限制",
      operator: and,
      limiters: [
        // 只有在有 userObj 且不是超级管理员时才添加此条件
        () =>
          userObj && !userObj.isSuperAdmin
            ? eq(departmentTable.isEnabled, true)
            : undefined,
      ],
    }
  );

  // 使用 whereCondition 进行查询
  // const rows = await db.select().from(departmentTable).where(whereCondition);
}

// ============================================
// 示例 2: 复杂的权限组合 - OR 条件
// ============================================

async function onListWithComplexPermission(keyword: string, userObj: UserObj) {
  const whereCondition = await limitQuery(
    and,
    {
      name: "关键词搜索",
      operator: and,
      limiters: [
        () => eq(departmentTable.name, keyword), // 示例：简化的关键词匹配
      ],
    },
    {
      name: "数据访问权限",
      operator: or, // 满足任一条件即可访问
      limiters: [
        // 条件1: 是自己创建的
        () => eq(departmentTable.creatorId, userObj.userId),
        // 条件2: 是已启用的公开数据
        () => eq(departmentTable.isEnabled, true),
        // 条件3: 是自己管理的部门
        () => {
          const managerIdArr = userObj.userId.toString();
          // 这里只是示例，实际需要使用 JSON 搜索或其他方式
          return eq(departmentTable.managerIdArr, [userObj.userId]);
        },
      ],
    }
  );

  // 使用 whereCondition 进行查询
}

// ============================================
// 示例 3: 异步条件 - 需要查询数据库
// ============================================

async function onListWithAsyncPermission(userObj: UserObj) {
  const whereCondition = await limitQuery(
    and,
    {
      name: "基础条件",
      operator: and,
      limiters: [() => eq(departmentTable.isEnabled, true)],
    },
    {
      name: "部门层级权限",
      operator: or,
      limiters: [
        // 异步获取用户可访问的部门ID列表
        async () => {
          // 模拟异步获取部门ID
          const accessibleDeptIds = await getAccessibleDepartmentIds(
            userObj.userId
          );
          if (accessibleDeptIds.length === 0) {
            return undefined; // 返回 undefined 会被自动过滤掉
          }
          return inArray(departmentTable.id, accessibleDeptIds);
        },
      ],
    }
  );

  // 使用 whereCondition 进行查询
}

// 模拟的辅助函数
async function getAccessibleDepartmentIds(userId: number): Promise<number[]> {
  // 实际实现：查询用户有权限访问的部门ID列表
  return [1, 2, 3];
}

// ============================================
// 示例 4: 嵌套的复杂权限组合
// ============================================

async function onListWithNestedPermission(keyword: string, userObj: UserObj) {
  const whereCondition = await limitQuery(
    and, // 顶层使用 AND：必须同时满足所有规则组
    {
      name: "搜索条件",
      operator: and,
      limiters: [() => eq(departmentTable.name, keyword)],
    },
    {
      name: "状态过滤",
      operator: and,
      limiters: [() => eq(departmentTable.isEnabled, true)],
    },
    {
      name: "部门范围权限",
      operator: or, // 组内使用 OR：满足任一即可
      limiters: [
        // 权限1: 超级管理员（实际上应该在外层判断，这里只是示例）
        () => (userObj.isSuperAdmin ? undefined : eq(departmentTable.id, -1)), // 永远不匹配
        // 权限2: 自己管理的部门
        async () => {
          const managedDepts = await getManagedDepartments(userObj.userId);
          return managedDepts.length > 0
            ? inArray(departmentTable.id, managedDepts)
            : undefined;
        },
        // 权限3: 自己所在部门及子部门
        async () => {
          if (!userObj.departmentObj?.value) return undefined;
          const deptTree = await getDepartmentTree(userObj.departmentObj.value);
          return deptTree.length > 0
            ? inArray(departmentTable.id, deptTree)
            : undefined;
        },
      ],
    }
  );

  // 使用 whereCondition 进行查询
}

// 模拟的辅助函数
async function getManagedDepartments(userId: number): Promise<number[]> {
  return [1, 2];
}

async function getDepartmentTree(deptId: number): Promise<number[]> {
  return [deptId, deptId + 1, deptId + 2]; // 示例：包含子部门
}

// ============================================
// 示例 5: 创建可复用的查询限制器
// ============================================

import { createQueryLimiter } from "@/middleware/accessControl/onRead/queryLimiter";

// 创建一个只读取已启用数据的限制器
const enabledDataLimiter = createQueryLimiter(and, {
  name: "启用状态限制",
  operator: and,
  limiters: [() => eq(departmentTable.isEnabled, true)],
});

// 在多处复用
async function example1() {
  const condition = await enabledDataLimiter();
  // 使用 condition 查询
}

async function example2() {
  const condition = await enabledDataLimiter();
  // 在另一个地方使用相同的限制
}

// ============================================
// 实际改造建议：重构 onGet
// ============================================

/**
 * 推荐的 onGet 重构方式
 */
async function onGetRefactored(
  params: { id: number },
  userObj?: UserObj
): Promise<any> {
  const { id } = params;

  const whereCondition = await limitQuery(
    and,
    {
      name: "ID 匹配",
      operator: and,
      limiters: [() => eq(departmentTable.id, id)],
    },
    {
      name: "读取权限",
      operator: and,
      limiters: [
        // 非超级管理员只能读取已启用的数据
        () =>
          userObj && !userObj.isSuperAdmin
            ? eq(departmentTable.isEnabled, true)
            : undefined,
      ],
    }
  );

  // const rows = await db.select().from(departmentTable).where(whereCondition).limit(1);
  // if (rows.length === 0) {
  //   throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  // }
  // return rows[0];
}
