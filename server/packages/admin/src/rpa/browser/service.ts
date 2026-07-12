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

  const headers: Record<string, string> = {};
  if (config.authToken) {
    headers["Authorization"] = `Bearer ${config.authToken}`;
  }

  try {
    if (config.authToken) {
      // ── Cloudflare Browser Run 模式 ──
      // POST /devtools/browser 创建一个临时 session，验证 API Token 是否有效
      let baseUrl = config.cdpUrl.trim().replace(/\/$/, "");
      // 将 ws(s):// 转为 https://
      if (baseUrl.startsWith("wss://")) {
        baseUrl = baseUrl.replace(/^wss:\/\//, "https://");
      } else if (baseUrl.startsWith("ws://")) {
        baseUrl = baseUrl.replace(/^ws:\/\//, "http://");
      } else if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }

      console.log(
        `[Verify Browser] CF Browser Run mode — POST ${baseUrl}/devtools/browser`
      );
      const res = await fetch(`${baseUrl}/devtools/browser`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.error(
          `[Verify Browser] CF API returned ${res.status}: ${await res.text()}`
        );
        return false;
      }
      const data = (await res.json()) as { webSocketDebuggerUrl?: string };
      const isSuccessful = !!data.webSocketDebuggerUrl;
      console.log(
        `[Verify Browser] CF Browser Run result: ${isSuccessful ? "SUCCESS" : "FAILED (no webSocketDebuggerUrl)"}`
      );
      return isSuccessful;
    } else {
      // ── 自托管 CDP 模式 ──
      let targetUrl = config.cdpUrl;
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

      const urlObj = new URL(targetUrl);
      const hostUrl = `${urlObj.protocol}//${urlObj.host}`;

      console.log(
        `[Verify Browser] Self-hosted CDP mode — GET ${hostUrl}/json/version`
      );
      const res = await fetch(`${hostUrl}/json/version`, {
        signal: AbortSignal.timeout(3000),
      });
      const versionData = (await res.json()) as {
        webSocketDebuggerUrl?: string;
      };
      const isSuccessful = !!versionData.webSocketDebuggerUrl;
      console.log(
        `[Verify Browser] Connectivity result: ${isSuccessful ? "SUCCESS" : "FAILED"}`
      );
      return isSuccessful;
    }
  } catch (err: any) {
    console.error("[Verify Browser] Connectivity test failed:", err.message);
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
