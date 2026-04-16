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
import type { FromSchema } from "json-schema-to-ts";
import {
  getUploadUrlReq,
  getUploadUrlRes,
  getDownloadUrlReq,
  getDownloadUrlRes,
  listReq,
  listRes,
  deleteReq,
  deleteRes,
} from "./model";

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
async function onGetUploadUrl(
  params: FromSchema<typeof getUploadUrlReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof getUploadUrlRes>> {
  const storage = await getActiveStorage(c.env);
  const url = await storage.getPresignedPutUrl(params.key, {
    contentType: params.contentType,
    expiresIn: params.expiresIn,
  });
  return { url, key: params.key };
}

const getUploadUrlApi = {
  req: getUploadUrlReq,
  res: getUploadUrlRes,
  pathInfo: {
    path: "/getUploadUrl",
    method: "post",
    summary: "获取文件上传预签名 URL",
  },
  adapter: bodyUserContextAdapter,
  service: onGetUploadUrl,
} satisfies API;

// 2. 生成下载预签名 URL
async function onGetDownloadUrl(
  params: FromSchema<typeof getDownloadUrlReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof getDownloadUrlRes>> {
  const storage = await getActiveStorage(c.env);
  const url = await storage.getPresignedGetUrl(params.key, {
    expiresIn: params.expiresIn,
  });
  return { url, key: params.key };
}

const getDownloadUrlApi = {
  req: getDownloadUrlReq,
  res: getDownloadUrlRes,
  pathInfo: {
    path: "/getDownloadUrl",
    method: "post",
    summary: "获取文件下载预签名 URL",
  },
  adapter: bodyUserContextAdapter,
  service: onGetDownloadUrl,
} satisfies API;

// 3. 列出文件
async function onList(
  params: FromSchema<typeof listReq>,
  userObj: any,
  c: any
): Promise<FromSchema<typeof listRes>> {
  const storage = await getActiveStorage(c.env);
  const list = await storage.list(params.prefix);
  return {
    list: list.map((item) => ({
      ...item,
      lastModified: item.lastModified?.toISOString(),
    })),
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "列出存储桶中的文件" },
  adapter: bodyUserContextAdapter,
  service: onList,
} satisfies API;

// 4. 删除文件
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
