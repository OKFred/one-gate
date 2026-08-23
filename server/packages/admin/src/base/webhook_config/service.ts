import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { RequiredKeys, UserObj } from "@hodor/core/types/app";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import {
  IndexVO,
  WebhookConfigAddKeys,
  WebhookConfigAddVO,
  WebhookConfigDetailKeys,
  WebhookConfigGetKeys,
  WebhookConfigListKeys,
  WebhookConfigPO,
  WebhookConfigSortableKeys,
  WebhookConfigUpdateKeys,
  WebhookConfigUpdateVO,
  type WebhookConfigPOLike,
} from "./model.js";
import * as repository from "./repository.js";

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

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    source: WebhookConfigPO.source,
    isEnabled: WebhookConfigPO.isEnabled,
    orderBy: orderByWrapper<(keyof WebhookConfigPOLike)[]>(
      WebhookConfigSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<WebhookConfigPOLike>[]>(
    { ...WebhookConfigPO },
    [...WebhookConfigListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(params: FromSchema<typeof listReq>) {
  const pageNo = params.pageNo ?? 1;
  const pageSize = Math.min(params.pageSize ?? 10, 1000);
  const { total, list } = await repository.findPage({
    ...params,
    source: params.source ? normalizeSource(params.source) : undefined,
    pageNo,
    pageSize,
  });
  return {
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
    list: list.map((item) => ({ ...item, url: maskWebhookUrl(item.url) })),
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取 Webhook 配置" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: { ...WebhookConfigAddVO },
  required: [...WebhookConfigAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;
const indexRes = { ...IndexVO.id } as const satisfies JSONSchema;

async function onAdd(params: FromSchema<typeof addReq>, userObj: UserObj) {
  const source = normalizeSource(params.source);
  if (params.isPrimary) await repository.resetPrimaryFlags(source);
  return repository.onInsert({
    ...params,
    source,
    url: validateWebhookUrl(params.url),
    creatorId: userObj.userId,
  });
}

const addApi = {
  req: addReq,
  res: indexRes,
  pathInfo: { path: "/add", method: "post", summary: "添加 Webhook 配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: { ...WebhookConfigUpdateVO },
  required: [...WebhookConfigUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
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

const updateApi = {
  req: updateReq,
  res: indexRes,
  pathInfo: { path: "/update", method: "post", summary: "更新 Webhook 配置" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...WebhookConfigGetKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;
const detailRes = {
  type: "object",
  properties: { ...WebhookConfigPO },
  required: [...WebhookConfigDetailKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDetail(params: FromSchema<typeof getReq>) {
  const row = await repository.findById(params.id);
  preventEmpty(row);
  return row;
}

const detailApi = {
  req: getReq,
  res: detailRes,
  pathInfo: {
    path: "/detail",
    method: "post",
    summary: "获取 Webhook 配置详情",
  },
  adapter: bodyAdapter,
  service: onDetail,
  permission: { action: "edit" },
} satisfies API;

async function onDelete(params: FromSchema<typeof getReq>) {
  const row = await repository.onDelete(params.id);
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: getReq,
  res: indexRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除 Webhook 配置" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  detail: detailApi,
  delete: deleteApi,
};
