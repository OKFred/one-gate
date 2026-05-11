import { BusinessError } from "@/middleware/errorHandler/businessError";
import { utils as permissionUtils } from "./service";

/**
 * 权限模块错误码映射
 */
export const ErrorCodes = {
  NOT_FOUND: "errorHandler.system.permission.notFound",
} as const;
