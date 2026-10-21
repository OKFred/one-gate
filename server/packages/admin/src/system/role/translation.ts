import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import { RoleDeletionError } from "./errors";

export const roleDeletionTranslations: TranslationInputItem[] = [
  {
    application: "backend",
    tKey: RoleDeletionError.NOT_ACTIVE,
    langCodes: {
      "zh-CN": "角色不存在或已删除，请刷新查看",
      "en-US":
        "The role is missing or deleted; refresh to check its current state",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.HAS_REFERENCES,
    langCodes: {
      "zh-CN": "仍有用户使用此角色，包含禁用用户；请先解除关联",
      "en-US":
        "Users still reference this role, including disabled users; remove the assignments first",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.DEPARTMENTS_UNAVAILABLE,
    langCodes: {
      "zh-CN": "角色部门范围不可用，请先恢复相关部门",
      "en-US":
        "The role department scope is unavailable; restore the referenced departments first",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.NAME_CONFLICT,
    langCodes: {
      "zh-CN": "角色名称已被使用",
      "en-US": "An active role already uses this name",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.NOT_DELETED,
    langCodes: {
      "zh-CN": "记录状态已变化，请刷新查看",
      "en-US": "The record state changed; refresh to check its current state",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.STALE_DELETION,
    langCodes: {
      "zh-CN": "删除版本已变化，请刷新后重试",
      "en-US": "The deletion version changed; refresh before retrying",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.EXPIRED,
    langCodes: {
      "zh-CN": "已满30天保留期，无法恢复",
      "en-US": "The 30-day recovery window has expired",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.STATE_CONFLICT,
    langCodes: {
      "zh-CN": "角色状态或配置已变化，请刷新后重试",
      "en-US":
        "The role state or configuration changed; refresh before retrying",
    },
  },
  {
    application: "backend",
    tKey: RoleDeletionError.CLOCK_CONFLICT,
    langCodes: {
      "zh-CN": "角色更新时间未早于服务器时间，请稍后重试或检查时钟",
      "en-US":
        "The role update time is not earlier than server time; retry later or check the clock",
    },
  },
];
