import type { FromSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminMailTemplateBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as mailTemplateRepository from "./repository";

const S = adminMailTemplateBackendSchemas;

async function onListAll(
  params: FromSchema<typeof S.listAllReq>
): Promise<FromSchema<typeof S.listAllRes>> {
  return await mailTemplateRepository.findPageAll(params);
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await mailTemplateRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: creatorId } = userObj;
  const addData = {
    ...obj,
    creatorId,
  };
  const insertedId = await mailTemplateRepository.onInsert(addData);
  return insertedId || null;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  const row = await mailTemplateRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
}

async function onDelete(
  obj: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number> {
  const { id } = obj;
  const row = await mailTemplateRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}

async function onGet(
  obj: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = obj;
  const row = await mailTemplateRepository.findById(id);
  preventEmpty(row);
  return row;
}

export default createCrudApis(S, {
  listAll: { summary: "获取所有邮件模板（不分页）", handler: onListAll },
  list: { summary: "获取邮件模板列表", handler: onList },
  add: { summary: "添加邮件模板", handler: onAdd },
  update: { summary: "更新邮件模板", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除邮件模板",
    handler: onDelete,
  },
  get: { summary: "获取邮件模板", handler: onGet },
});
