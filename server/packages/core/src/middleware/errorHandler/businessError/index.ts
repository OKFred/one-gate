import { HTTPException } from "hono/http-exception";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";
import {
  BusinessErrorCode as GlobalBusinessErrorCodeMap,
  ERROR_PRESENTATION_MAP,
} from "./errorMapping";
import type { BusinessErrorCode as GlobalBusinessErrorCode } from "./errorMapping";

// 导出原始错误码常量以保持兼容性
export const BusinessErrorCode = GlobalBusinessErrorCodeMap;
// 扩展错误码类型，支持业务模块定义的自定义字符串（通常是 i18nKey）
export type BusinessErrorCode = GlobalBusinessErrorCode | (string & {});

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
  // 优先从全局映射表中查找，如果找不到，则默认 code 本身即为 i18nKey
  const presentation = ERROR_PRESENTATION_MAP[
    error.code as GlobalBusinessErrorCode
  ] || {
    i18nKey: error.code as string,
    status: StatusCodes.OK,
  };

  // 归一化 details 详细错误数组
  const details: {
    type: string;
    message: string;
    params?: Record<string, any>;
  }[] = [];

  if (error.meta) {
    if (Array.isArray(error.meta.details)) {
      details.push(...error.meta.details);
    } else if (Array.isArray(error.meta.fields)) {
      error.meta.fields.forEach((f: any) => {
        details.push({
          type: f.field || f.type || "field_error",
          message: f.error || f.message || "",
          params: f.params,
        });
      });
    } else if (typeof error.meta.message === "string") {
      details.push({
        type: error.meta.type || "detail_error",
        message: error.meta.message,
        params: error.meta.params,
      });
    }
  }

  return new HTTPException(
    (presentation.status || StatusCodes.OK) as ContentfulStatusCode,
    {
      message: presentation.i18nKey,
      cause: {
        error,
        code: error.code || undefined,
        details: details.length > 0 ? details : undefined,
        params: error.meta || undefined,
      },
    }
  );
}
