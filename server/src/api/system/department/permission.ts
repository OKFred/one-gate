import departmentTable from "./model";
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
import { DataScope } from "@/types/dataScope";

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
      name: "数据访问范围限制",
      operator: or,
      limiters: [
        async () => {
          if (!userObj) return undefined;
          switch (userObj.dataScope) {
            case DataScope.ALL:
              // 全部数据，不加任何限制
              return undefined;

            case DataScope.DEPT_AND_BELOW: {
              // 用户本部门及其子孙部门
              const userDeptId = userObj.departmentObj?.value;
              if (!userDeptId) return eq(departmentTable.id, -1); // 无匹配
              const descendants =
                await departmentUtils.getDescendantDepartments(userDeptId);
              const managedIds = [
                userDeptId,
                ...(descendants?.map((d) => d.id) || []),
              ];
              return inArray(departmentTable.id, managedIds);
            }

            case DataScope.CUSTOM: {
              // 自定义部门列表
              const ids = userObj.customDeptIds ?? [];
              if (ids.length === 0) return eq(departmentTable.id, -1); // 无匹配
              return inArray(departmentTable.id, ids);
            }

            case DataScope.SELF_ONLY:
            default:
              // 仅本人创建的数据
              return eq(departmentTable.creatorId, userObj.userId);
          }
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
        switch (userObj.dataScope) {
          case DataScope.ALL:
            return true;
          case DataScope.DEPT_AND_BELOW: {
            const userDeptId = userObj.departmentObj?.value;
            if (!userDeptId) return false;
            if (parentId === userDeptId) return true;
            const descendants =
              await departmentUtils.getDescendantDepartments(userDeptId);
            return !!descendants?.some((d) => d.id === parentId);
          }
          case DataScope.CUSTOM:
            return (userObj.customDeptIds ?? []).includes(parentId);
          case DataScope.SELF_ONLY:
          default:
            return false;
        }
      },
      BusinessErrorCode.PERMISSION_DENIED
    ),

  /** 校验父部门存在且可访问（用于新增，parentId 可为空表示根部门） */
  parentExists: (parentId: number | null, userObj: UserObj): ValidationRule =>
    Guards.condition(
      "父部门存在校验",
      async () => {
        if (!parentId) return true; // parentId 为 null, undefined 或 0 时视为根部门
        return !!(await departmentService.get.service(
          { id: parentId },
          userObj
        ));
      },
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

  /** 禁止将子孙部门设为父部门（防止产生环路） */
  notDescendantParent: (
    id: number,
    parentId: number | null | undefined
  ): ValidationRule =>
    Guards.condition(
      "部门父部门环路校验",
      async () => {
        if (!parentId) return true;
        const descendants = await departmentUtils.getDescendantDepartments(id);
        if (!descendants) return true;
        return !descendants.some((d) => d.id === parentId);
      },
      BusinessErrorCode.INVALID_PARAMS,
      { reason: "不能将子孙部门设为父部门，会导致死循环" }
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
