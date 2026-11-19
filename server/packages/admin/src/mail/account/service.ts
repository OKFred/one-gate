import type { FromSchema } from "json-schema-to-ts";
import { adminMailAccountBackendSchemas } from "@hodor/contracts/resources";
import type { UserObj } from "@hodor/core/types/app";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as mailAccountRepository from "./repository";

const S = adminMailAccountBackendSchemas;

async function onListAll(params: FromSchema<typeof S.listAllReq>) {
  return await mailAccountRepository.findPageAll(params);
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await mailAccountRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(obj: FromSchema<typeof S.addReq>, userObj: UserObj) {
  const { userId: creatorId } = userObj;
  const { password: base64Password, ...rest } = obj;
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const insertedId = await mailAccountRepository.onInsert({
    ...rest,
    password: plainPassword,
    creatorId,
  });
  return insertedId || null;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
) {
  const { userId: updaterId } = userObj;
  const { id, isEnabled, password: base64Password, ...rest } = params;
  const plainPassword = base64Password
    ? Buffer.from(base64Password, "base64").toString("utf-8")
    : undefined;

  const row = await mailAccountRepository.onUpdate(id, {
    ...rest,
    password: plainPassword,
    updaterId,
    updateTimeUtc: Date.now(),
    isEnabled: isEnabled !== undefined ? isEnabled : undefined,
  });
  preventEmpty(row);
  return row.id;
}

async function onDelete(
  obj: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
) {
  const row = await mailAccountRepository.onDelete(obj.id);
  preventEmpty(row);
  return row.id;
}

async function onGet(obj: FromSchema<typeof S.getReq>) {
  const row = await mailAccountRepository.findById(obj.id);
  preventEmpty(row);
  return row;
}

async function getMailAccountsByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  return await mailAccountRepository.getMailAccountsByIds(ids);
}

export const utils = {
  getMailAccountsByIds,
};

export default createCrudApis(S, {
  listAll: { handler: onListAll, summary: "获取所有邮件账户（不分页）" },
  list: { handler: onList, summary: "获取邮件账户列表" },
  add: { handler: onAdd, summary: "添加邮件账户" },
  update: { handler: onUpdate, summary: "更新邮件账户" },
  delete: {
    handler: onDelete,
    adapter: bodyUserAdapter,
    summary: "删除邮件账户",
  },
  get: { handler: onGet, summary: "获取邮件账户" },
});
