import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";
import { SUPER_ADMIN_ROLE_ID } from "@/db/init";
import { utils as departmentUtils } from "@/api/system/department/service";
import { utils as roleUtils } from "@/api/system/role/service";
import { utils as regionUtils } from "@/api/i18n/region/service";
import { utils as languageUtils } from "@/api/i18n/language/service";

/**
 * 用户模块错误码映射
 * 必须同步在 src/db/initTranslation.ts 中补全翻译
 */
export const ErrorCodes = {
  SUPER_ADMIN_DELETE: "errorHandler.system.user.superAdminDeleteProhibited",
  SUPER_ADMIN_DISABLE: "errorHandler.system.user.superAdminDisableProhibited",
} as const;

/**
 * 判断是否为超级管理员
 */
const isSuperAdmin = (roleIdArr: number[]) => {
  return roleIdArr.includes(SUPER_ADMIN_ROLE_ID);
};

/**
 * 禁止删除超级管理员用户
 */
export const preventSuperAdminDelete = (roleIdArr: number[]) => {
  if (isSuperAdmin(roleIdArr)) {
    throw new BusinessError(ErrorCodes.SUPER_ADMIN_DELETE);
  }
};

/**
 * 禁止禁用超级管理员用户
 */
export const preventSuperAdminDisable = (
  roleIdArr: number[],
  newIsEnabled: boolean | undefined
) => {
  if (isSuperAdmin(roleIdArr) && newIsEnabled === false) {
    throw new BusinessError(ErrorCodes.SUPER_ADMIN_DISABLE);
  }
};

/**
 * 校验引用的部门是否存在
 */
export const preventMissingDepartment = async (departmentId: number | null) => {
  if (departmentId) {
    await departmentUtils.verifyDepartment(departmentId);
  }
};

/**
 * 校验引用的角色是否存在
 */
export const preventMissingRoles = async (roleIdArr: number[]) => {
  if (roleIdArr.length > 0) {
    await roleUtils.verifyRoles(roleIdArr);
  }
};

/**
 * 校验引用的地区是否存在
 */
export const preventMissingRegion = async (regionId: number | null) => {
  if (regionId) {
    await regionUtils.verifyRegion(regionId);
  }
};

/**
 * 校验引用的语言代码是否存在
 */
export const preventInvalidLangCode = async (langCode: string | undefined) => {
  if (langCode) {
    await languageUtils.verifyLangCode(langCode);
  }
};
