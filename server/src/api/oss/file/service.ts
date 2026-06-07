import { getDefaultConfig } from "../config/service";
import { getStorage } from "@/utils/storage";
import { preventEmpty } from "@/middleware/auth/prevention";
import { preventStorageInitFailure } from "../config/prevention";
import type { API } from "@/middleware/encapsulation";
import { bodyUserContextAdapter } from "@/middleware/encapsulation/adapter";
import type { FromSchema } from "json-schema-to-ts";
import {
  listReq,
  listRes,
  listAllReq,
  listAllRes,
  getReq,
  getRes,
  addReq,
  addRes,
  updateReq,
  updateRes,
  deleteReq,
  deleteRes,
} from "./model";

// 辅助函数：移除对象中值为 undefined 的属性，避免 JSON Schema 校验失败
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanUndefined(v)])
    );
  }
  return obj;
}

// 获取存储实例辅助函数
async function getActiveStorage(env: any) {
  const config = await getDefaultConfig();
  preventEmpty(config);

  const storage = getStorage(
    {
      provider: config.provider,
      endpoint: config.endpoint || undefined,
      region: config.region || undefined,
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
      bucket: config.bucket,
      accountId: config.accountId || undefined,
    },
    env
  );

  preventStorageInitFailure(storage);
  return storage!;
}

// 1. 分页列出文件
async function onList(
  params: FromSchema<typeof listReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof listRes>> {
  const storage = await getActiveStorage(c.env);
  const result = await storage.list({
    prefix: params.keyword,
    limit: params.pageSize,
    cursor: params.cursor,
  });

  const list = result.objects.map((item) => ({
    key: item.key,
    size: item.size,
    lastModified: item.lastModified?.toISOString(),
    contentType: item.contentType,
  }));

  return cleanUndefined({
    list,
    total: list.length,
    pageSize: params.pageSize || 10,
    cursor: result.cursor,
    hasMore: result.isTruncated,
  });
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "列出存储桶中的文件(分页)",
  },
  adapter: bodyUserContextAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 2. 获取全部文件
async function onListAll(
  params: FromSchema<typeof listAllReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof listAllRes>> {
  const storage = await getActiveStorage(c.env);
  const allObjects = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await storage.list({
      prefix: params.keyword,
      limit: 1000,
      cursor,
    });
    allObjects.push(...result.objects);
    cursor = result.cursor;
    hasMore = result.isTruncated;
  }

  return cleanUndefined(
    allObjects.map((item) => ({
      key: item.key,
      size: item.size,
      lastModified: item.lastModified?.toISOString(),
      contentType: item.contentType,
    }))
  );
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有文件（不分页）",
  },
  adapter: bodyUserContextAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

// 3. 获取单文件详情 (含下载链接)
async function onGet(
  params: FromSchema<typeof getReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof getRes>> {
  const storage = await getActiveStorage(c.env);
  const meta = await storage.head(params.key);
  preventEmpty(meta);

  const downloadUrl = await storage.getPresignedGetUrl(params.key, {
    expiresIn: 3600,
  });

  return cleanUndefined({
    key: meta.key,
    size: meta.size,
    lastModified: meta.lastModified?.toISOString(),
    contentType: meta.contentType,
    downloadUrl,
  });
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: { path: "/get", method: "post", summary: "获取文件详情及下载链接" },
  adapter: bodyUserContextAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 4. 新增文件 (获取上传 URL)
async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof addRes>> {
  const storage = await getActiveStorage(c.env);
  const url = await storage.getPresignedPutUrl(params.key, {
    contentType: params.contentType,
    expiresIn: params.expiresIn,
  });
  return { url, key: params.key };
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "获取新建文件上传凭证" },
  adapter: bodyUserContextAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 5. 更新文件 (覆盖)
async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof updateRes>> {
  // 对于 OSS 来说，更新其实和新增一样，都是拿 PUT URL 去覆盖同名文件
  return onAdd(params, userObj, c);
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "获取覆盖文件上传凭证",
  },
  adapter: bodyUserContextAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 6. 删除文件
async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof deleteRes>> {
  const storage = await getActiveStorage(c.env);
  await storage.delete(params.key);
  return { key: params.key };
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除文件" },
  adapter: bodyUserContextAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

export const utils = {
  getActiveStorage,
};

export default {
  list: listApi,
  listAll: listAllApi,
  get: getApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
};
