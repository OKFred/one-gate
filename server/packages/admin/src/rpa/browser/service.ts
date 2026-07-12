import {
  IndexVO,
  BrowserVO,
  BrowserAddVO,
  BrowserUpdateVO,
  BrowserAddKeys,
  BrowserUpdateKeys,
  BrowserGetKeys,
  BrowserListKeys,
  BrowserSortableKeys,
  type BrowserPOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as repository from "./repository";

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: BrowserVO["isEnabled"],
    orderBy: orderByWrapper<(keyof BrowserPOLike)[]>(BrowserSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<BrowserPOLike>[]>({ ...BrowserVO }, [
    ...BrowserListKeys,
  ]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await repository.findBrowserPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "分页获取浏览器环境配置",
  },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...BrowserAddVO },
  required: [...BrowserAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;

  if (obj.isDefault) {
    await repository.disableOtherBrowserDefaults();
  }

  // @ts-ignore
  const insertedId = await repository.onBrowserInsert({
    ...obj,
    creatorId,
  });
  return insertedId || null;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "新建浏览器配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...BrowserUpdateVO },
  required: [...BrowserUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const existing = await repository.findBrowserById(id as number);
  preventEmpty(existing);

  if (params.isDefault) {
    await repository.disableOtherBrowserDefaults(id as number);
  }

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  // @ts-ignore
  const row = await repository.onBrowserUpdate(id as number, updateData);
  preventEmpty(row);
  return row.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新浏览器配置",
  },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 删除
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...BrowserGetKeys],
} as const satisfies JSONSchema;

async function onDelete(obj: FromSchema<typeof getReq>) {
  const row = await repository.onBrowserDelete(obj.id as number);
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: getReq,
  res: addRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除浏览器配置",
  },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 验证 CDP 连通性
async function onVerify(obj: FromSchema<typeof getReq>): Promise<boolean> {
  const config = await repository.findBrowserById(obj.id as number);
  preventEmpty(config);

  let targetUrl = config.cdpUrl;
  // 1. 标准化协议：如果是 WebSocket 地址，转换为 HTTP 地址以执行连通性校验
  if (targetUrl.startsWith("ws://")) {
    targetUrl = targetUrl.replace(/^ws:\/\//, "http://");
  } else if (targetUrl.startsWith("wss://")) {
    targetUrl = targetUrl.replace(/^wss:\/\//, "https://");
  } else if (
    !targetUrl.startsWith("http://") &&
    !targetUrl.startsWith("https://")
  ) {
    targetUrl = `http://${targetUrl}`;
  }

  // 2. 解析 Host 部分并请求 CDP 服务的 /json/version 接口
  try {
    const urlObj = new URL(targetUrl);
    const hostUrl = `${urlObj.protocol}//${urlObj.host}`;

    console.log(
      `[Verify Browser] Fast HTTP connectivity testing on: ${hostUrl}/json/version`
    );
    const res = await fetch(`${hostUrl}/json/version`, {
      signal: AbortSignal.timeout(3000),
    });
    const versionData = (await res.json()) as { webSocketDebuggerUrl?: string };

    // 如果能够获取到 webSocketDebuggerUrl，说明 CDP 调试服务正在正常提供服务且端口完全畅通
    const isSuccessful = !!versionData.webSocketDebuggerUrl;
    console.log(
      `[Verify Browser] Connectivity result: ${isSuccessful ? "SUCCESS" : "FAILED"}`
    );
    return isSuccessful;
  } catch (err: any) {
    console.error(
      "[Verify Browser] Fast HTTP connectivity test failed:",
      err.message
    );
    return false;
  }
}

const verifyApi = {
  req: getReq,
  res: { type: "boolean" },
  pathInfo: {
    path: "/verify",
    method: "post",
    summary: "验证 CDP 连接连通性",
  },
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  verify: verifyApi,
};
