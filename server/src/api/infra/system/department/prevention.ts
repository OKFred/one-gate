import { BusinessError } from "@/middleware/errorHandler/businessError";
import { preventEmpty } from "@/middleware/auth/prevention";
import { utils as departmentUtils } from "./service";
import { utils as userUtils } from "@/api/infra/system/user/service";

/**
 * 部门模块错误码映射
 * 必须同步在 src/db/initTranslation.ts 中补全翻译
 */
export const ErrorCodes = {
  SELF_PARENT: "errorHandler.department.selfParent",
  DESCENDANT_PARENT: "errorHandler.department.descendantParent",
  HAS_ENABLED_USER: "errorHandler.departmentHasEnabledUser",
  HAS_CHILDREN: "errorHandler.hasChildren",
  PERMISSION_DENIED: "errorHandler.permissionDenied",
} as const;

/**
 * 校验父部门存在且可访问
 */
export const preventMissingParent = async (parentId: number | null) => {
  if (!parentId) return;
  const exists = await departmentUtils.getDepartmentNameById(parentId);
  preventEmpty(exists);
};

/**
 * 禁止将自身设为父部门
 */
export const preventSelfParent = (
  id: number,
  parentId: number | null | undefined
) => {
  if (parentId === id) {
    throw new BusinessError(ErrorCodes.SELF_PARENT);
  }
};

/**
 * 禁止将子孙部门设为父部门（防止产生环路）
 */
export const preventCircularParent = async (
  id: number,
  parentId: number | null | undefined
) => {
  if (!parentId) return;
  const descendants = await departmentUtils.getDescendantDepartments(id);
  if (descendants?.some((d) => d.id === parentId)) {
    throw new BusinessError(ErrorCodes.DESCENDANT_PARENT);
  }
};

/**
 * 校验部门下无已启用用户
 */
export const preventHasEnabledUsers = async (id: number) => {
  const userCount = await userUtils.countDepartmentUsers([id], true);
  if (userCount > 0) {
    throw new BusinessError(ErrorCodes.HAS_ENABLED_USER);
  }
};

/**
 * 校验部门下无子女部门
 */
export const preventHasChildren = async (id: number) => {
  const children = await departmentUtils.getChildDepartments(id);
  if (children && children.length > 0) {
    throw new BusinessError(ErrorCodes.HAS_CHILDREN);
  }
};

/**
 * 部门禁用前置校验
 */
export const preventDisable = async (
  id: number,
  currentIsEnabled: boolean | null,
  newIsEnabled: boolean | null | undefined
) => {
  if (currentIsEnabled === true && newIsEnabled === false) {
    await preventHasEnabledUsers(id);
    await preventHasChildren(id);
  }
};
