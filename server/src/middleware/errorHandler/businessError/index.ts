import { HTTPException } from "hono/http-exception";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";
import { BusinessErrorCode, ERROR_PRESENTATION_MAP } from "./errorMapping";
export { BusinessErrorCode } from "./errorMapping";
export class BusinessError extends Error {
  code: BusinessErrorCode;
  meta?: Record<string, any>;

  constructor(code: BusinessErrorCode, meta?: Record<string, any>) {
    super(code);
    this.code = code;
    this.meta = meta;
    // 设置原型链，以支持 instanceof 检查
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

export function toHttpException(error: BusinessError) {
  const presentation = ERROR_PRESENTATION_MAP[error.code];
  return new HTTPException(
    (presentation.status || StatusCodes.OK) as ContentfulStatusCode,
    {
      message: presentation.i18nKey,
      cause: {
        error,
        code: error.code || undefined,
        params: error.meta || undefined,
      },
    }
  );
}
