import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const sharedTranslations = {
  "business.type": [],
  components: [],
  common: [],
  "business.exception": [
    {
      application: "backend",
      tKey: "errorHandler.databaseBusy",
      langCodes: {
        "zh-CN": "数据库繁忙或锁定",
        "en-US": "Database busy or locked",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.databaseError",
      langCodes: {
        "zh-CN": "数据库操作错误",
        "en-US": "Database operation error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.dockerApiError",
      langCodes: {
        "zh-CN": "Docker API 调用失败",
        "en-US": "Docker API call failed",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.totpGateRequired",
      langCodes: {
        "zh-CN": "请先完成动态验证码验证",
        "en-US": "Authenticator verification is required",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.totpCodeInvalid",
      langCodes: {
        "zh-CN": "动态验证码错误、已过期或已使用",
        "en-US": "Authenticator code is invalid, expired, or already used",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.totpGateRateLimited",
      langCodes: {
        "zh-CN": "验证尝试过于频繁，请稍后再试",
        "en-US": "Too many verification attempts; try again later",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.totpGateUnavailable",
      langCodes: {
        "zh-CN": "动态验证码门禁暂不可用",
        "en-US": "Authenticator gate is temporarily unavailable",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notFound",
      langCodes: {
        "zh-CN": "未找到请求的资源",
        "en-US": "Resource not found",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.targetNotExist",
      langCodes: {
        "zh-CN": "目标不存在",
        "en-US": "Target does not exist",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.forbidden",
      langCodes: {
        "zh-CN": "禁止访问",
        "en-US": "Access forbidden",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.permissionDenied",
      langCodes: {
        "zh-CN": "权限不足",
        "en-US": "Permission denied",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.validationFailed",
      langCodes: {
        "zh-CN": "请求校验失败",
        "en-US": "Request validation failed",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.serverError",
      langCodes: {
        "zh-CN": "服务器异常",
        "en-US": "Server error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.unknownError",
      langCodes: {
        "zh-CN": "未知异常",
        "en-US": "Unknown error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.undefinedError",
      langCodes: {
        "zh-CN": "未定义的错误类型",
        "en-US": "Undefined error type",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.duplicatedData",
      langCodes: {
        "zh-CN": "数据重复",
        "en-US": "Duplicated data",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.invalidParams",
      langCodes: {
        "zh-CN": "无效的参数",
        "en-US": "Invalid parameters",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.hasChildren",
      langCodes: {
        "zh-CN": "存在子节点，请检查后重试",
        "en-US": "Child nodes exist, please check and try again",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notAuthenticated",
      langCodes: {
        "zh-CN": "用户未认证或token无效",
        "en-US": "User not authenticated or token is invalid",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notExistOrDisabled",
      langCodes: {
        "zh-CN": "数据不存在或已被禁用",
        "en-US": "Data does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notYetImplemented",
      langCodes: {
        "zh-CN": "功能暂未实现",
        "en-US": "Feature not yet implemented",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.validation.required",
      langCodes: {
        "zh-CN": "字段 {field} 不能为空",
        "en-US": "Field {field} is required",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.validation.type",
      langCodes: {
        "zh-CN": "字段 {field} 类型不符",
        "en-US": "Field {field} type mismatch",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.validation.minLength",
      langCodes: {
        "zh-CN": "字段 {field} 长度不够",
        "en-US": "Field {field} length is too short",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.validation.invalid",
      langCodes: {
        "zh-CN": "字段 {field} 格式不正确",
        "en-US": "Field {field} is invalid",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    "business.type" | "components" | "common" | "business.exception"
  >,
  TranslationInputItem[]
>;

export const actionTranslations = {
  read: {
    "zh-CN": "查看",
    "en-US": "View",
  },
  list: {
    "zh-CN": "列表",
    "en-US": "List",
  },
  add: {
    "zh-CN": "新增",
    "en-US": "Add",
  },
  edit: {
    "zh-CN": "编辑",
    "en-US": "Edit",
  },
  delete: {
    "zh-CN": "删除",
    "en-US": "Delete",
  },
  export: {
    "zh-CN": "导出",
    "en-US": "Export",
  },
  view: {
    "zh-CN": "浏览",
    "en-US": "View",
  },
  "batch-delete": {
    "zh-CN": "批量删除",
    "en-US": "Batch Delete",
  },
  dispatch: {
    "zh-CN": "下发",
    "en-US": "Dispatch",
  },
  restore: {
    "zh-CN": "恢复",
    "en-US": "Restore",
  },
  purge: {
    "zh-CN": "彻底删除",
    "en-US": "Permanently delete",
  },
  unknown: {
    "zh-CN": "未知动作",
    "en-US": "Unknown Action",
  },
} as const;
