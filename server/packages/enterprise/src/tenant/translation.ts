import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import { TenantError } from "./errors";

export const tenantTranslations: TranslationInputItem[] = [
  {
    application: "backend",
    tKey: TenantError.NOT_VISIBLE,
    langCodes: {
      "zh-CN": "企业或记录不可用，或你无权访问",
      "en-US": "The enterprise or record is unavailable or not accessible",
    },
  },
  {
    application: "backend",
    tKey: TenantError.STATE_CONFLICT,
    langCodes: {
      "zh-CN":
        "企业状态、成员权限或版本已变化；不能移除最后一名有效所有者，请刷新后重试",
      "en-US":
        "Enterprise state, membership or version changed; the last active owner cannot be removed. Refresh before retrying",
    },
  },
  {
    application: "backend",
    tKey: TenantError.KEY_CONFLICT,
    langCodes: {
      "zh-CN": "企业标识已被使用，不能复用",
      "en-US": "The enterprise key is already in use and cannot be reused",
    },
  },
  {
    application: "backend",
    tKey: TenantError.HUMAN_REQUIRED,
    langCodes: {
      "zh-CN": "此操作仅允许用户身份执行，机器令牌不可使用",
      "en-US":
        "This operation requires a user identity and is not available to machine tokens",
    },
  },
  {
    application: "backend",
    tKey: TenantError.PLATFORM_REQUIRED,
    langCodes: {
      "zh-CN": "此操作仅允许当前平台超级管理员执行",
      "en-US":
        "This operation requires the current platform super administrator",
    },
  },
  {
    application: "backend",
    tKey: TenantError.OWNER_REQUIRED,
    langCodes: {
      "zh-CN": "此操作需要本企业所有者权限",
      "en-US": "This operation requires an owner of this enterprise",
    },
  },
  {
    application: "backend",
    tKey: TenantError.TOKEN_UNAVAILABLE,
    langCodes: {
      "zh-CN": "令牌不可用、无映射读取权限或不属于你",
      "en-US":
        "The token is unavailable, lacks mapping-read permission, or is not owned by you",
    },
  },
  {
    application: "backend",
    tKey: TenantError.USER_UNAVAILABLE,
    langCodes: {
      "zh-CN": "目标用户不存在或已停用",
      "en-US": "The target user is missing or disabled",
    },
  },
];
