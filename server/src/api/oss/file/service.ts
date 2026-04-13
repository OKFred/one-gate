import { getDefaultConfig } from "../config/service";
import { getStorage } from "@/utils/storage";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import type { API } from "@/middleware/encapsulation";
import {
  bodyAdapter,
  bodyUserContextAdapter,
} from "@/middleware/encapsulation/adapter";

// 获取存储实例辅助函数
async function getActiveStorage(env: any) {
  const config = await getDefaultConfig();
  if (!config)
    throw new BusinessError(
      BusinessErrorCode.NOT_EXIST_OR_DISABLED
      /* "未配置默认存储"*/
    );

  return getStorage(
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
}

// 1. 生成上传预签名 URL
const getUploadUrlReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件名/路径" },
    contentType: {
      type: "string",
      description: "文件类型",
      default: "application/octet-stream",
    },
    expiresIn: { type: "number", description: "过期时间(秒)", default: 3600 },
  },
  required: ["key"],
} as const;

async function onGetUploadUrl(params: any, userObj: any, c: any) {
  const storage = await getActiveStorage(c.env);
  const url = await storage.getPresignedPutUrl(params.key, {
    contentType: params.contentType,
    expiresIn: params.expiresIn,
  });
  return { url, key: params.key };
}

const getUploadUrlApi = {
  req: getUploadUrlReq,
  res: {
    type: "object",
    properties: { url: { type: "string" }, key: { type: "string" } },
  },
  pathInfo: {
    path: "/getUploadUrl",
    method: "post",
    summary: "获取文件上传预签名 URL",
  },
  adapter: bodyUserContextAdapter,
  service: onGetUploadUrl,
} satisfies API;

// 2. 生成下载预签名 URL
const getDownloadUrlReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件名/路径" },
    expiresIn: { type: "number", description: "过期时间(秒)", default: 3600 },
  },
  required: ["key"],
} as const;

async function onGetDownloadUrl(params: any, userObj: any, c: any) {
  const storage = await getActiveStorage(c.env);
  const url = await storage.getPresignedGetUrl(params.key, {
    expiresIn: params.expiresIn,
  });
  return { url, key: params.key };
}

const getDownloadUrlApi = {
  req: getDownloadUrlReq,
  res: {
    type: "object",
    properties: { url: { type: "string" }, key: { type: "string" } },
  },
  pathInfo: {
    path: "/getDownloadUrl",
    method: "post",
    summary: "获取文件下载预签名 URL",
  },
  adapter: bodyUserContextAdapter,
  service: onGetDownloadUrl,
} satisfies API;

// 3. 列出文件 (新增)
const listReq = {
  type: "object",
  properties: {
    prefix: { type: "string", description: "前缀/路径", default: "" },
  },
} as const;

async function onList(params: any, userObj: any, c: any) {
  const storage = await getActiveStorage(c.env);
  const list = await storage.list(params.prefix);
  return { list };
}

const listApi = {
  req: listReq,
  res: {
    type: "object",
    properties: {
      list: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            size: { type: "number" },
            lastModified: { type: "string", format: "date-time" },
            contentType: { type: "string" },
          },
        },
      },
    },
  },
  pathInfo: { path: "/list", method: "post", summary: "列出存储桶中的文件" },
  adapter: bodyUserContextAdapter,
  service: onList,
} satisfies API;

// 4. 删除文件 (新增)
const deleteReq = {
  type: "object",
  properties: {
    key: { type: "string", description: "文件名/路径" },
  },
  required: ["key"],
} as const;

async function onDelete(params: any, userObj: any, c: any) {
  const storage = await getActiveStorage(c.env);
  await storage.delete(params.key);
  return { key: params.key };
}

const deleteApi = {
  req: deleteReq,
  res: { type: "object", properties: { key: { type: "string" } } },
  pathInfo: { path: "/delete", method: "post", summary: "删除存储桶中的文件" },
  adapter: bodyUserContextAdapter,
  service: onDelete,
} satisfies API;

export default {
  getUploadUrl: getUploadUrlApi,
  getDownloadUrl: getDownloadUrlApi,
  list: listApi,
  delete: deleteApi,
};
