/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/model";
import { PermissionAddLike } from "@/api/system/permission/service";
import { initialTranslationData } from "./initTranslation";
import { SUPER_ADMIN_ID } from "./init";
import { getEnv } from "@/utils/env";
import { sql } from "drizzle-orm";
const LOCALE = getEnv("LOCALE") || "zh-CN";

/**
 * 基础权限种子数据 (结构化)
 */
const permissionSeeds: Record<string, Record<string, string[]>> = {
  system: {
    "": ["read"],
    user: ["read", "add", "edit", "delete", "export"],
    role: ["read", "add", "edit", "delete"],
    permission: ["read", "add", "edit", "delete"],
    department: ["read", "add", "edit", "delete"],
    menu: ["read", "add", "edit", "delete"],
    role_permission: ["read", "add", "edit", "delete", "batch-delete"],
    auth: ["read", "update_profile", "update_password"],
  },
  mail: {
    "": ["read"],
    account: ["read", "add", "edit", "delete"],
    template: ["read", "add", "edit", "delete"],
    log: ["read", "view"],
  },
  i18n: {
    "": ["read"],
    language: ["read", "add", "edit", "delete"],
    region: ["read", "add", "edit", "delete"],
    translation: ["read", "add", "edit", "delete"],
  },
  maintenance: {
    "": ["read"],
    cache: ["read", "add", "edit", "delete", "view"],
    audit_login: ["read"],
  },
  oss: {
    "": ["read"],
    config: ["read", "add", "edit", "delete"],
    file: ["read", "add", "edit", "delete"],
  },
  enterprise: {
    "": ["read"],
    attendance: ["read", "add", "edit", "delete"],
  },
};

/**
 * 准备系统权限数据同步语句
 */
export async function preparePermissions(options?: { reset?: boolean }) {
  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  const queries: any[] = [];

  if (options?.reset) {
    queries.push(db.delete(permissionTable));
  }

  const creatorId = SUPER_ADMIN_ID; // 系统初始化

  // 1. 嵌套循环生成打平后的权限数据
  const mappedData = [];
  for (const [parent, modules] of Object.entries(permissionSeeds)) {
    for (const [module, actions] of Object.entries(modules)) {
      for (const action of actions) {
        const code = module
          ? `${parent}.${module}:${action}`
          : `${parent}:${action}`;
        const business = module ? `${parent}.${module}` : parent;

        // 获取显示名称
        const getActionName = () => {
          const tKeySubString = module ? `${parent}.${module}` : parent;
          const trans = initialTranslationData.find(
            (item) => item.tKey === "businessType." + tKeySubString
          );
          const prefix = trans?.langCodes?.[LOCALE];

          // 动作名称映射
          const actionNameMap: Record<string, string> = {
            read: "查看",
            list: "列表",
            add: "新增",
            edit: "编辑",
            delete: "删除",
            export: "导出",
            view: "浏览",
            "batch-delete": "批量删除",
            update_profile: "更新资料",
            update_password: "更新密码",
          };

          const actionName = actionNameMap[action] || action;
          return prefix ? `${prefix}-${actionName}` : code + "未知动作";
        };

        mappedData.push({
          code,
          name: getActionName(),
          category: "action",
          resource: null,
          business,
          remark: null,
          isEnabled: true,
          creatorId,
        });
      }
    }
  }

  stats.total = mappedData.length;

  // 2. 分批执行以规避 SQL 变量限制
  const BATCH_SIZE = 10;
  for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
    const batch = mappedData.slice(i, i + BATCH_SIZE);
    queries.push(
      db
        .insert(permissionTable)
        .values(batch as any)
        .onConflictDoUpdate({
          target: permissionTable.code,
          set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            resource: sql`excluded.resource`,
            business: sql`excluded.business`,
          },
        })
    );
  }

  stats.created = mappedData.length;
  return { queries, stats };
}

export default {
  preparePermissions,
};
