import departmentTable from "./db.table";
import { and, eq, inArray, like, or, SQL } from "drizzle-orm";
import departmentService, { utils as departmentUtils } from "./service";
import { type UserObj, utils as userUtils } from "../user/service";
import hasValue from "@/utils/hasValue";
import { BusinessErrorCode } from "@/middleware/errorHandler/businessError";
import { limitQuery } from "@/middleware/accessControl/onRead/queryLimiter";
import {
  guardOperation,
  Guards,
  type ValidationRule,
} from "@/middleware/accessControl/onWrite/operationGuard";

// 构建查询条件(列表和全部通用)
export const buildWhereCondition = async (
  condition?: { id?: number; keyword?: string; parentId?: number },
  userObj?: UserObj
): Promise<SQL | undefined> => {
  const { id, keyword, parentId } = condition || {};
  return await limitQuery(
    and,
    {
      name: "ID匹配",
      operator: and,
      limiters: [() => (hasValue(id) ? eq(departmentTable.id, id) : undefined)],
    },
    {
      name: "关键词搜索",
      operator: and,
      limiters: [
        () =>
          hasValue(keyword)
            ? like(departmentTable.name, `%${keyword}%`)
            : undefined,
      ],
    },
    {
      name: "父部门过滤",
      operator: and,
      limiters: [
        () =>
          parentId !== undefined
            ? eq(departmentTable.parentId, parentId)
            : undefined,
      ],
    },
    {
      name: "本人数据访问限制",
      operator: or,
      limiters: [
        // 超级管理员不受限制，普通用户只能访问自己创建的部门或自己可管理的部门
        () =>
          !userObj || userObj.isSuperAdmin
            ? undefined
            : eq(departmentTable.creatorId, userObj.userId),
        // 获取用户可管理的部门ID列表，若列表非空则添加 in 条件限制
        async () => {
          if (!userObj || userObj.isSuperAdmin) return undefined;
          const managedIds = await departmentUtils.getManagableIds(
            userObj.userId
          );
          if (managedIds.length === 0) return undefined;
          return inArray(departmentTable.id, managedIds);
        },
      ],
    }
  );
};

export const presetGuards = {
  /** 检查用户是否有部门写入权限（需能管理目标父部门） */
  writePermission: (userObj: UserObj, parentId: number): ValidationRule =>
    Guards.condition(
      "部门写入权限",
      async () => {
        if (userObj.isSuperAdmin) return true;
        return await departmentUtils.canUserManageDepartment(
          userObj.userId,
          parentId
        );
      },
      BusinessErrorCode.PERMISSION_DENIED
    ),

  /** 校验父部门存在且可访问（用于新增，parentId 必须有效） */
  parentExists: (parentId: number | null, userObj: UserObj): ValidationRule =>
    Guards.condition(
      "父部门存在校验",
      async () =>
        !!(await departmentService.get.service({ id: parentId }, userObj)),
      BusinessErrorCode.NOT_EXIST_OR_DISABLED
    ),

  /** 校验父部门存在且可访问（用于更新，仅在父部门实际变更时才检查） */
  parentExistsIfChanged: (
    newParentId: number | null | undefined,
    currentParentId: number | null,
    userObj: UserObj
  ): ValidationRule =>
    Guards.condition(
      "父部门存在校验",
      async () => {
        if (!newParentId) return true; // 没有设置父部门，无需校验
        if (newParentId === currentParentId) return true; // 父部门未修改，无需校验
        return !!(await departmentService.get.service(
          { id: newParentId },
          userObj
        ));
      },
      BusinessErrorCode.NOT_EXIST_OR_DISABLED
    ),

  /** 禁止将自身设为父部门 */
  notSelfParent: (
    id: number,
    parentId: number | null | undefined
  ): ValidationRule =>
    Guards.condition(
      "部门父部门设置校验",
      () => parentId !== id,
      BusinessErrorCode.INVALID_PARAMS,
      { reason: "无效的父部门设置" }
    ),

  /** 部门下无已启用用户 */
  noEnabledUsers: (id: number): ValidationRule =>
    Guards.countIsZero(
      "已启用用户",
      async () => await userUtils.countDepartmentUsers([id], true),
      BusinessErrorCode.DEPARTMENT_HAS_ENABLED_USER
    ),

  /** 部门下无子女部门 */
  noChildren: (id: number): ValidationRule =>
    Guards.countIsZero(
      "子女部门",
      async () => {
        const children = await departmentUtils.getChildDepartments(id);
        return children ? children.length : 0;
      },
      BusinessErrorCode.HAS_CHILDREN
    ),

  /** 部门禁用前置条件校验（仅在从启用切换为禁用时生效） */
  disableCondition: (
    id: number,
    currentIsEnabled: boolean | null,
    newIsEnabled: boolean | null | undefined
  ): ValidationRule =>
    Guards.condition(
      "部门禁用权限",
      async () => {
        if (currentIsEnabled === true && newIsEnabled === false) {
          await guardOperation([
            presetGuards.noEnabledUsers(id),
            presetGuards.noChildren(id),
          ]);
        }
        return true;
      },
      BusinessErrorCode.INVALID_PARAMS,
      { reason: "部门不满足禁用条件" }
    ),
};
