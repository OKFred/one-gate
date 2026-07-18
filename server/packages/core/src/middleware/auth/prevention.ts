import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";

/**
 * 校验资源是否存在，调用后 TypeScript 自动将值收窄为非空类型。
 * @param value 待检查的值（对象、数组、null 或 undefined）
 * @param errorCode 错误码，默认为 NOT_EXIST_OR_DISABLED
 */
export function preventEmpty<T>(
  value: T | null | undefined,
  errorCode: BusinessErrorCode = BusinessErrorCode.NOT_EXIST_OR_DISABLED
): asserts value is NonNullable<T> {
  if (
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0)
  ) {
    throw new BusinessError(errorCode);
  }
}
