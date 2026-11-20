import type { FromSchema } from "json-schema-to-ts";
import { adminBaseWebhookConfigBackendSchemas } from "@hodor/contracts/resources";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { UserObj } from "@hodor/core/types/app";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import * as repository from "./repository.js";

const S = adminBaseWebhookConfigBackendSchemas;

function normalizeSource(source: string): string {
  return source.trim().toLowerCase();
}

function validateWebhookUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error("protocol");
    return url.toString();
  } catch {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: "Webhook URL 必须是有效的 HTTPS 地址",
    });
  }
}

export function maskWebhookUrl(value: string): string {
  try {
    const url = new URL(value);
    const suffix = url.pathname.slice(-6);
    return `${url.origin}/***${suffix}`;
  } catch {
    return "***";
  }
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const pageNo = params.pageNo ?? 1;
  const pageSize = Math.min(params.pageSize ?? 10, 1000);
  const { total, list } = await repository.findPage({
    ...params,
    source: params.source ? normalizeSource(params.source) : undefined,
    pageNo,
    pageSize,
  });
  return buildPagedListResult(
    list.map((item) => ({ ...item, url: maskWebhookUrl(item.url) })),
    total,
    pageNo,
    pageSize
  );
}

async function onAdd(params: FromSchema<typeof S.addReq>, userObj: UserObj) {
  const source = normalizeSource(params.source);
  if (params.isPrimary) await repository.resetPrimaryFlags(source);
  return repository.onInsert({
    ...params,
    source,
    url: validateWebhookUrl(params.url),
    creatorId: userObj.userId,
  });
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
) {
  const existing = await repository.findById(params.id);
  preventEmpty(existing);
  const source = params.source
    ? normalizeSource(params.source)
    : existing.source;
  const targetIsPrimary = params.isPrimary ?? existing.isPrimary;
  if (
    targetIsPrimary &&
    (params.isPrimary === true || source !== existing.source)
  ) {
    await repository.resetPrimaryFlags(source, params.id);
  }
  const { id, ...rest } = params;
  const row = await repository.onUpdate(id, {
    ...rest,
    source,
    url: params.url ? validateWebhookUrl(params.url) : undefined,
    updaterId: userObj.userId,
    updateTimeUtc: Date.now(),
  });
  preventEmpty(row);
  return row.id;
}

async function onDetail(params: FromSchema<typeof S.getReq>) {
  const row = await repository.findById(params.id);
  preventEmpty(row);
  return row;
}

const detailApi = {
  req: S.getReq,
  res: S.getRes,
  pathInfo: {
    path: "/detail",
    method: "post",
    summary: "获取 Webhook 配置详情",
  },
  adapter: bodyAdapter,
  service: onDetail,
  permission: { action: "edit" },
} satisfies API;

async function onDelete(params: FromSchema<typeof S.deleteReq>) {
  const row = await repository.onDelete(params.id);
  preventEmpty(row);
  return row.id;
}

export default createCrudApis(S, {
  list: { handler: onList, summary: "分页获取 Webhook 配置" },
  add: { handler: onAdd, summary: "添加 Webhook 配置" },
  update: { handler: onUpdate, summary: "更新 Webhook 配置" },
  delete: { handler: onDelete, summary: "删除 Webhook 配置" },
  extra: { detail: detailApi },
});
