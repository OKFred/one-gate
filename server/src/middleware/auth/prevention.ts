import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";

/**
 * 校验资源是否存在
 * @param value 待检查的值（对象、数组、null 或 undefined）
 * @param errorCode 错误码，默认为 NOT_EXIST_OR_DISABLED
 */
export function preventEmpty<T>(
  value: T | null | undefined | T[],
  errorCode: BusinessErrorCode = BusinessErrorCode.NOT_EXIST_OR_DISABLED
): T | T[] {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    throw new BusinessError(errorCode);
  }
  return value;
}
