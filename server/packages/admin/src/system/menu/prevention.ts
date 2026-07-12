import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError/index";
import { utils as menuUtils } from "./service";
import hasValue from "@hodor/core/utils/hasValue";

/** 菜单校验相关错误码 */
export const ErrorCodes = {
  PARENT_NOT_EXIST: "errorHandler.menu.parentNotExist",
  SELF_PARENT: "errorHandler.menu.selfParent",
  CIRCULAR_PARENT: "errorHandler.menu.circularParent",
  HAS_CHILDREN: "errorHandler.menu.hasChildren",
  HAS_ENABLED_CHILDREN: "errorHandler.menu.hasEnabledChildren",
} as const;

/** 确保父菜单存在 */
export const preventMissingParent = async (
  parentId: number | null | undefined
) => {
  if (!hasValue(parentId)) return;
  const allMenus = await menuUtils.getAllMenus();
  if (!allMenus.some((m) => m.id === parentId)) {
    throw new BusinessError(ErrorCodes.PARENT_NOT_EXIST);
  }
};

/** 禁止自关联（父菜单不能是自己） */
export const preventSelfParent = (
  id: number,
  parentId: number | null | undefined
) => {
  if (hasValue(parentId) && id === parentId) {
    throw new BusinessError(ErrorCodes.SELF_PARENT);
  }
};

/** 禁止环路（父菜单不能是自己的子孙） */
export const preventCircularParent = async (
  id: number,
  parentId: number | null | undefined
) => {
  if (!parentId) return;
  const descendants = await menuUtils.getDescendantMenus(id);
  if (descendants?.some((d) => d.id === parentId)) {
    throw new BusinessError(ErrorCodes.CIRCULAR_PARENT);
  }
};

/** 删除前检查：是否有子菜单 */
export const preventDeleteWithChildren = async (id: number) => {
  const children = await menuUtils.getChildMenus(id);
  if (children && children.length > 0) {
    throw new BusinessError(ErrorCodes.HAS_CHILDREN);
  }
};

/** 禁用前检查：是否有已启用的子菜单 */
export const preventDisableWithEnabledChildren = async (
  id: number,
  currentIsEnabled: boolean,
  newIsEnabled: boolean | undefined
) => {
  if (currentIsEnabled === true && newIsEnabled === false) {
    const enabledCount = await menuUtils.countEnabledChildMenus(id);
    if (enabledCount > 0) {
      throw new BusinessError(ErrorCodes.HAS_ENABLED_CHILDREN);
    }
  }
};
