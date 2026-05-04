import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";
import type { UserObj } from "@/api/system/user/service";
import { can as globalCan } from "@/middleware/auth/qualify";

/** 考勤资源标识符 (对应权限表中的前缀) */
export const attendance = "enterprise.attendance";

/**
 * 考勤模块权限校验逻辑
 * @param userObj 用户对象
 * @param action 动作类型 ('read', 'add', 'edit', 'delete' 等)
 */
export const validateQualify = (userObj: UserObj, action: string) => {
  if (!globalCan(userObj, action, attendance)) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
};
