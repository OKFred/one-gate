import { IndexVO, TranslationVO } from "./model";
import * as translationRepository from "./repository";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminI18nTranslationBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { kv } from "@hodor/core/middleware/cache";

const S = adminI18nTranslationBackendSchemas;

async function onListAll(
  params: FromSchema<typeof S.listAllReq>
): Promise<FromSchema<typeof S.listAllRes>> {
  return await translationRepository.findPageAll(params);
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await translationRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    keyword: params.keyword,
    application: params.application,
    business: params.business,
    langCode: params.langCode,
    isEnabled: params.isEnabled,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: Pick<UserObj, "userId">
): Promise<number> {
  const { userId: creatorId } = userObj;

  const addData = {
    application: params.application,
    business: params.business,
    langCode: params.langCode,
    tKey: params.tKey,
    tValue: params.tValue,
    valueHash: params.valueHash,
    remark: params.remark ?? null,
    isEnabled: params.isEnabled,
    creatorId,
  };
  const transId = await translationRepository.onInsert(addData);

  // 如果是后端应用，同步更新 KV 缓存
  if (params.application === "backend") {
    await cacheSync(params, "add");
  }

  return transId;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;
  const previousRecord = await onGet({ id }); // 若记录不存在则由 preventEmpty 抛出

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  const row = await translationRepository.onUpdate(id, updateData);
  preventEmpty(row);

  // 如果涉及后端文案，同步更新 KV 缓存
  if (
    params.application === "backend" ||
    previousRecord.application === "backend"
  ) {
    const current = await onGet({ id });
    if (current.application === "backend") {
      await cacheSync(current, "update");
    } else {
      await cacheSync(current, "delete");
    }
  }
  const updateRow = row;
  preventEmpty(updateRow);
  return updateRow.id;
}

async function onDelete(
  params: FromSchema<typeof S.deleteReq>
): Promise<number> {
  const { id } = params;
  // 先取出记录（若不存在则 preventEmpty 抛出），用于删除后的缓存同步
  const record = await onGet({ id });
  const row = await translationRepository.onDelete(id);
  preventEmpty(row);
  // 获取删除前的信息以更新 KV
  if (record.application === "backend") {
    await cacheSync(record, "delete");
  }

  return row.id;
}

async function onGet(
  params: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = params;
  const row = await translationRepository.findById(id);
  preventEmpty(row);
  return row;
}

async function getTranslationsByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  return await translationRepository.findTranslationsByIds(ids);
}

// 检查重复文案
const checkDuplicateReq = {
  type: "object",
  properties: {
    tValue: S.voProperties.tValue,
    valueHash: S.voProperties.valueHash,
    excludeId: {
      ...IndexVO.id,
      description: "要排除的记录 ID（可选）",
      type: ["number", "null"],
      nullable: true,
    },
  },
  required: ["tValue", "valueHash"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const checkDuplicateRes = {
  type: "object",
  properties: {
    hasDuplicate: { type: "boolean", description: "是否有重复" },
    duplicates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: IndexVO.id,
          application: TranslationVO.application,
          business: TranslationVO.business,
          langCode: TranslationVO.langCode,
          tKey: TranslationVO.tKey,
          tValue: TranslationVO.tValue,
          isEnabled: TranslationVO.isEnabled,
        },
      },
    },
  },
  required: ["hasDuplicate", "duplicates"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onCheckDuplicate(
  params: FromSchema<typeof checkDuplicateReq>
): Promise<FromSchema<typeof checkDuplicateRes>> {
  const { tValue, valueHash, excludeId } = params;
  const rows = await translationRepository.findDuplicates({
    valueHash,
    excludeId: excludeId || undefined,
  });
  const filteredRows = rows.filter((row) => row.tValue === tValue);
  return {
    hasDuplicate: filteredRows.length > 0,
    duplicates: filteredRows,
  };
}

const checkDuplicateApi = {
  req: checkDuplicateReq,
  res: checkDuplicateRes,
  pathInfo: {
    path: "/checkDuplicate",
    method: "post",
    summary: "检查是否有重复的翻译文案",
  } as const,
  adapter: bodyAdapter,
  service: onCheckDuplicate,
  permission: { action: "read" },
} satisfies API;

/** SHA256 哈希计算 */
async function calculateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheSync(
  record: Pick<
    FromSchema<typeof S.addReq>,
    "application" | "langCode" | "tKey" | "tValue"
  >,
  operation: "add" | "update" | "delete"
) {
  const cacheKey = `i18n.translation:${record.langCode}.${record.tKey}`;
  if (operation === "add") {
    if (record.application !== "backend") return;
    await kv.put(cacheKey, record.tValue);
  } else if (operation === "update") {
    if (record.application !== "backend") return;
    await kv.put(cacheKey, record.tValue);
  } else if (operation === "delete") {
    await kv.delete(cacheKey);
  }
}

async function verifyTKeyUnique(
  obj: { tKey?: string; langCode?: string },
  excludeId?: number
) {
  const row = await translationRepository.findByKeyAndLang({
    tKey: obj.tKey!,
    langCode: obj.langCode!,
    excludeId,
  });
  return row === null;
}

export const utils = {
  getTranslationsByIds,
  calculateSHA256,
  verifyTKeyUnique,
};

export default createCrudApis(S, {
  listAll: {
    permission: false,
    summary: "获取所有多语言翻译（不分页）",
    handler: onListAll,
  },
  list: { summary: "获取多语言翻译列表", handler: onList },
  add: { summary: "添加多语言翻译", handler: onAdd },
  update: { summary: "更新多语言翻译", handler: onUpdate },
  delete: { summary: "删除多语言翻译", handler: onDelete },
  get: { summary: "获取多语言翻译", handler: onGet },
  extra: { checkDuplicate: checkDuplicateApi },
});
