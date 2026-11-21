import type { FromSchema } from "json-schema-to-ts";
import { adminI18nLanguageBackendSchemas } from "@hodor/contracts/resources";
import type { UserObj } from "@hodor/core/types/app";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import * as languageRepository from "./repository";

const S = adminI18nLanguageBackendSchemas;

async function onListAll(params: FromSchema<typeof S.listAllReq>) {
  return await languageRepository.findPageAll(params);
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const {
    orderBy = "sortOrder",
    descend = false,
    pageNo = 1,
    pageSize = 10,
  } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await languageRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    keyword: params.keyword,
    isEnabled: params.isEnabled,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: Pick<UserObj, "userId">
) {
  return await languageRepository.onInsert({
    ...params,
    creatorId: userObj.userId,
  });
}

async function onGet(params: FromSchema<typeof S.getReq>) {
  const row = await languageRepository.findById(params.id);
  preventEmpty(row);
  return row;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
) {
  const { id, ...rest } = params;
  await onGet({ id });

  const row = await languageRepository.onUpdate(id, {
    ...rest,
    updaterId: userObj.userId,
    updateTimeUtc: Date.now(),
  });
  preventEmpty(row);
  return row.id;
}

async function onDelete(params: FromSchema<typeof S.deleteReq>) {
  const row = await languageRepository.onDelete(params.id);
  preventEmpty(row);
  return row.id;
}

async function verifyLangCode(langCode: string): Promise<void> {
  const row = await languageRepository.findByLangCode({
    langCode,
    isEnabled: true,
  });
  preventEmpty(row);
}

async function verifyLangCodeUnique(langCode: string, excludeId?: number) {
  const row = await languageRepository.findByLangCode({
    langCode,
    excludeId,
  });
  return row === null;
}

export const utils = {
  verifyLangCode,
  verifyLangCodeUnique,
};

export default createCrudApis(S, {
  listAll: {
    handler: onListAll,
    permission: false,
    summary: "获取所有语言（不分页）",
  },
  list: { handler: onList, summary: "获取语言列表" },
  add: { handler: onAdd, summary: "添加语言" },
  update: { handler: onUpdate, summary: "更新语言" },
  delete: { handler: onDelete, summary: "删除语言" },
  get: { handler: onGet, summary: "获取语言详情" },
});
