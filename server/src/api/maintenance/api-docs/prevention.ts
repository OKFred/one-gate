import { BusinessError } from "@/middleware/errorHandler/businessError";

/** API文档校验相关错误码 */
export const ErrorCodes = {
  INVALID_FORMAT: "errorHandler.apiDocs.invalidFormat",
  UNSUPPORTED_FORMAT: "errorHandler.apiDocs.unsupportedFormat",
  PARSE_FAILED: "errorHandler.apiDocs.parseFailed",
  PARSE_FAILED_GENERAL: "errorHandler.apiDocs.parseFailedGeneral",
} as const;

/** 校验文档格式是否可以解析 */
export const preventInvalidFormat = (success: boolean) => {
  if (!success) {
    throw new BusinessError(ErrorCodes.INVALID_FORMAT);
  }
};

/** 校验是否为支持的 Swagger 或 OpenAPI 格式 */
export const preventUnsupportedFormat = (
  isOAS3: boolean,
  isSwagger2: boolean
) => {
  if (!isOAS3 && !isSwagger2) {
    throw new BusinessError(ErrorCodes.UNSUPPORTED_FORMAT);
  }
};

/** 抛出新增/上传时的解析异常 */
export const preventParseFailed = (message?: string) => {
  throw new BusinessError(ErrorCodes.PARSE_FAILED, { message });
};

/** 抛出更新时的解析异常 */
export const preventParseFailedGeneral = (message?: string) => {
  throw new BusinessError(ErrorCodes.PARSE_FAILED_GENERAL, { message });
};
