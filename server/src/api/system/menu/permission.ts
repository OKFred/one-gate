import menuTable from "./model";
import { and, eq, like, or, SQL } from "drizzle-orm";
import menuService, { utils as menuUtils } from "./service";
import { BusinessErrorCode } from "@/middleware/errorHandler/businessError";
import { limitQuery } from "@/middleware/accessControl/onRead/queryLimiter";
import {
  guardOperation,
  Guards,
  type ValidationRule,
} from "@/middleware/accessControl/onWrite/operationGuard";
import hasValue from "@/utils/hasValue";

// 构建查询条件(列表和全部通用)
export const buildWhereCondition = async (condition?: {
  id?: number;
  keyword?: string;
  business?: string | null;
  isEnabled?: boolean;
}): Promise<SQL | undefined> => {
  const { id, keyword, business, isEnabled } = condition || {};
  return await limitQuery(
    and,
    {
      name: "ID匹配",
      operator: and,
      limiters: [() => (hasValue(id) ? eq(menuTable.id, id) : undefined)],
    },
    {
      name: "关键词搜索",
      operator: and,
      limiters: [
        () =>
          hasValue(keyword)
            ? or(like(menuTable.name, `%${keyword}%`))
            : undefined,
      ],
    },
    {
      name: "业务标识过滤",
      operator: and,
      limiters: [
        () =>
          hasValue(business) ? eq(menuTable.business, business) : undefined,
      ],
    },
    {
      name: "启用状态过滤",
      operator: and,
      limiters: [
        () =>
          isEnabled !== undefined
            ? eq(menuTable.isEnabled, isEnabled)
            : undefined,
      ],
    }
  );
};

export const presetGuards = {
  /** 校验父菜单存在（用于新增，parentId 必须有效） */
  parentExists: (parentId: number | null | undefined): ValidationRule =>
    Guards.condition(
      "父菜单存在校验",
      async () => {
        if (!hasValue(parentId)) return true; // 没有父菜单时无需校验
        return !!(await menuService.get.service({ id: parentId! }));
      },
      BusinessErrorCode.NOT_EXIST_OR_DISABLED
    ),

  /** 校验父菜单存在（用于更新，仅在父菜单实际变更时才检查） */
  parentExistsIfChanged: (
    newParentId: number | null | undefined,
    currentParentId: number | null
  ): ValidationRule =>
    Guards.condition(
      "父菜单存在校验",
      async () => {
        if (!hasValue(newParentId)) return true; // 没有设置父菜单，无需校验
        if (newParentId === currentParentId) return true; // 父菜单未修改，无需校验
        return !!(await menuService.get.service({ id: newParentId! }));
      },
      BusinessErrorCode.NOT_EXIST_OR_DISABLED
    ),

  /** 禁止将自身设为父菜单 */
  notSelfParent: (
    id: number,
    parentId: number | null | undefined
  ): ValidationRule =>
    Guards.condition(
      "菜单父菜单设置校验",
      () => parentId !== id,
      BusinessErrorCode.INVALID_PARAMS,
      { reason: "无效的父菜单设置" }
    ),

  /** 禁止将子孙菜单设为父菜单（防止产生环路） */
  notDescendantParent: (
    id: number,
    parentId: number | null | undefined
  ): ValidationRule =>
    Guards.condition(
      "菜单父菜单环路校验",
      async () => {
        if (!parentId) return true;
        const descendants = await menuUtils.getDescendantMenus(id);
        if (!descendants) return true;
        return !descendants.some((d) => d.id === parentId);
      },
      BusinessErrorCode.INVALID_PARAMS,
      { reason: "不能将子孙菜单设为父菜单，会导致死循环" }
    ),

  /** 菜单下无子菜单 */
  noChildren: (id: number): ValidationRule =>
    Guards.countIsZero(
      "子菜单数量",
      async () => {
        const children = await menuUtils.getChildMenus(id);
        return children ? children.length : 0;
      },
      BusinessErrorCode.HAS_CHILDREN
    ),

  /** 菜单下无已启用子菜单 */
  noEnabledChildren: (id: number): ValidationRule =>
    Guards.countIsZero(
      "已启用子菜单数量",
      async () => await menuUtils.countEnabledChildMenus(id),
      BusinessErrorCode.HAS_CHILDREN
    ),

  /** 菜单禁用前置条件校验（仅在从启用切换为禁用时生效） */
  disableCondition: (
    id: number,
    currentIsEnabled: boolean | null,
    newIsEnabled: boolean | null | undefined
  ): ValidationRule =>
    Guards.condition(
      "菜单禁用权限",
      async () => {
        if (currentIsEnabled === true && newIsEnabled === false) {
          await guardOperation([presetGuards.noEnabledChildren(id)]);
        }
        return true;
      },
      BusinessErrorCode.INVALID_PARAMS,
      { reason: "菜单不满足禁用条件" }
    ),
};
