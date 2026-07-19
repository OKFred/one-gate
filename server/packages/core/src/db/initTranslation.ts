import db from "./index";
import { translationTable } from "../../../admin/src/i18n/translation/model";
import { utils as translationUtils } from "../../../admin/src/i18n/translation/service";
import { SUPER_ADMIN_ID } from "./init";
import { sql } from "drizzle-orm";

import { aiTranslations } from "../../../admin/src/ai/translation";
import { swarmTranslations } from "../../../admin/src/swarm/translation";
import { i18nTranslations } from "../../../admin/src/i18n/translation";
import { mailTranslations } from "../../../admin/src/mail/translation";
import { maintenanceTranslations } from "../../../admin/src/maintenance/translation";
import { ossTranslations } from "../../../admin/src/oss/translation";
import { dataTranslations } from "../../../admin/src/data/translation";
import { attendanceTranslations } from "../../../enterprise/src/organization/attendance/translation";
import { workflowTranslations } from "../../../enterprise/src/executive/workflow/translation";
import { profileTranslations } from "../../../personal/src/profile/translation";
import { systemTranslations } from "../../../admin/src/system/translation";
import { browserTranslations } from "../../../admin/src/rpa/browser/translation";
import { baseTranslations } from "../../../admin/src/base/translation";
import { sharedTranslations } from "./translation/shared";
import type { BusinessKey } from "../types/business";
import type { LanguageCode } from "./initLanguage";

export type BatchTranslationItem = {
  application: "frontend" | "backend";
  business: BusinessKey;
  tKey: string;
  langCodes: Record<LanguageCode, string>;
  isEnabled: boolean;
};

export type TranslationInputItem = {
  application?: string;
  tKey: string;
  langCodes: Record<LanguageCode, string>;
  isEnabled?: boolean;
};

export function mapTranslations(
  map: Partial<Record<BusinessKey, TranslationInputItem[]>>
): BatchTranslationItem[] {
  const list: BatchTranslationItem[] = [];
  for (const [business, items] of Object.entries(map)) {
    if (!items) continue;
    for (const item of items) {
      list.push({
        application: item.application === "backend" ? "backend" : "frontend",
        business: business as BusinessKey,
        tKey: item.tKey,
        isEnabled: item.isEnabled ?? true,
        langCodes: item.langCodes,
      });
    }
  }
  return list;
}

/**
 * 准备多语言数据同步语句
 */
export async function prepareTranslation(options?: { reset?: boolean }) {
  // 0. 数据扁平化处理
  const flattenedData: any[] = [];
  for (const item of initialTranslationData) {
    for (const [langCode, tValue] of Object.entries(item.langCodes)) {
      flattenedData.push({
        ...item,
        langCode,
        tValue,
      });
    }
  }

  const stats = {
    total: flattenedData.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  const queries: any[] = [];

  if (options?.reset) {
    queries.push(db.delete(translationTable));
  }

  // 1. 预处理所有数据的哈希值 (并行处理)
  const mappedData = await Promise.all(
    flattenedData.map(async (item) => {
      const valueHash = await translationUtils.calculateSHA256(item.tValue);
      return {
        application: item.application,
        business: item.business,
        langCode: item.langCode,
        tKey: item.tKey,
        tValue: item.tValue,
        valueHash,
        remark: null,
        isEnabled: item.isEnabled,
        creatorId: SUPER_ADMIN_ID,
      };
    })
  );

  // 2. 将数据拆分为小批次以规避 SQL 变量限制
  const BATCH_SIZE = 10;
  for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
    const batch = mappedData.slice(i, i + BATCH_SIZE);
    queries.push(
      db
        .insert(translationTable)
        .values(batch)
        .onConflictDoUpdate({
          target: [translationTable.tKey, translationTable.langCode],
          set: {
            tValue: sql`excluded.t_value`,
            valueHash: sql`excluded.value_hash`,
            isEnabled: sql`excluded.is_enabled`,
          },
        })
    );
  }

  stats.created = mappedData.length;
  return { queries, stats };
}

export const initialTranslationData = mapTranslations({
  ...sharedTranslations,
  ...aiTranslations,
  ...swarmTranslations,
  ...i18nTranslations,
  ...mailTranslations,
  ...maintenanceTranslations,
  ...dataTranslations,
  ...ossTranslations,
  ...attendanceTranslations,
  ...workflowTranslations,
  ...profileTranslations,
  ...systemTranslations,
  ...browserTranslations,
  ...baseTranslations,
}) satisfies BatchTranslationItem[];
