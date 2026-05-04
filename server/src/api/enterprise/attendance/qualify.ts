import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";
import type { UserObj } from "@/api/system/user/service";

/** 考勤数据权限枚举 */
export const AttendanceQualify = {
  LIST: "enterprise:attendance:list",
  GET: "enterprise:attendance:get",
  ADD: "enterprise:attendance:add",
  UPDATE: "enterprise:attendance:update",
  DELETE: "enterprise:attendance:delete",
} as const;

/** 权限检查逻辑 */
export const validateQualify = (userObj: UserObj, permission: string) => {
  if (userObj.isSuperAdmin) return;
  const hasPermission = userObj.permissions.some((p) => p.code === permission);
  if (!hasPermission) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
};
