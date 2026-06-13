/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/model";
import { initialTranslationData } from "./initTranslation";
import { SUPER_ADMIN_ID } from "./init";
import { getEnv } from "@/utils/env";
import { sql } from "drizzle-orm";
import { permissionSeeds } from "@/constants/permissions";
import { actionTranslations } from "@/db/translation/shared";

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
