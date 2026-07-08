/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "./index";
import { permissionTable } from "../../../infra/src/system/permission/model";
import { rolePermissionTable } from "../../../infra/src/system/role_permission/model";
import { initialTranslationData } from "./initTranslation";
import { SUPER_ADMIN_ID } from "./init";
import { getEnv } from "../utils/env";
import { sql, notInArray, inArray } from "drizzle-orm";
import { permissionSeeds } from "../constants/permissions";
import { actionTranslations } from "./translation/shared";

const LOCALE = getEnv("LOCALE") || "zh-CN";

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

          const actionTrans =
            actionTranslations[action as keyof typeof actionTranslations];
          const actionName = actionTrans?.[LOCALE] || action;
          const unknownName =
            actionTranslations.unknown[
              LOCALE as keyof typeof actionTranslations.unknown
            ];
          return prefix ? `${prefix}-${actionName}` : code + unknownName;
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

  if (options?.reset) {
    queries.push(db.delete(permissionTable));
    queries.push(db.delete(rolePermissionTable));
  } else {
    // 自动清理已经废弃的权限（即不在当前 permissionSeeds 中的权限）
    const validCodes = mappedData.map((d) => d.code);
    if (validCodes.length > 0) {
      // 1. 先查出数据库中现有的所有权限代码
      const existing = await db
        .select({ code: permissionTable.code })
        .from(permissionTable);

      // 2. 内存过滤出被废弃的权限代码
      const codesToDelete = existing
        .map((row) => row.code)
        .filter((code) => !validCodes.includes(code));

      // 3. 只有当确实存在已被废弃的权限时才执行删除操作
      if (codesToDelete.length > 0) {
        const DELETE_BATCH = 100;
        for (let i = 0; i < codesToDelete.length; i += DELETE_BATCH) {
          const chunk = codesToDelete.slice(i, i + DELETE_BATCH);
          queries.push(
            db
              .delete(permissionTable)
              .where(inArray(permissionTable.code, chunk))
          );
        }
      }

      // 同时清理 system_role_permission 中已失效的 permissionId 关联
      queries.push(
        db
          .delete(rolePermissionTable)
          .where(sql`permission_id NOT IN (SELECT id FROM system_permission)`)
      );
    }
  }

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
