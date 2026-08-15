import { getDefaultConfig } from "../config/service";
import { getStorage } from "@hodor/core/utils/storage";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { preventStorageInitFailure } from "../config/prevention";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserContextAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { Context } from "@hodor/core/types/app";
import type {
  StorageObjectMetadata,
  StorageProvider,
} from "@hodor/core/utils/storage/types";
import type { FromSchema } from "json-schema-to-ts";
import {
  listReq,
  listRes,
  listDirectoryReq,
  listDirectoryRes,
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

type CleanValue =
  | string
  | number
  | boolean
  | null
  | CleanValue[]
  | { [key: string]: CleanValue };

function cleanUndefined<T>(obj: T): CleanValue {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanUndefined(value)])
    ) as { [key: string]: CleanValue };
  }
  return obj as CleanValue;
}

function validateSegments(path: string) {
  if (path.split("/").some((segment) => segment === "..")) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: ["Object key cannot contain '..' path segments"],
    });
  }
}

function normalizeObjectKey(key: string) {
  const normalized = key.replace(/^\/+/, "").replace(/\/+/g, "/").trim();
  validateSegments(normalized);
  if (!normalized || normalized.endsWith("/")) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: ["Object key is required and cannot be a directory prefix"],
    });
  }
  return normalized;
}

function normalizePrefix(prefix?: string) {
  const normalized = (prefix || "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim();
  validateSegments(normalized);
  if (!normalized) return "";
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function getNameFromPrefix(prefix: string) {
  const trimmed = prefix.replace(/\/+$/, "");
  return trimmed.split("/").pop() || trimmed;
}

function toFileVO(item: StorageObjectMetadata) {
  return {
    key: item.key,
    size: item.size,
    lastModified: item.lastModified?.toISOString(),
    contentType: item.contentType,
  };
}

export interface ActiveStorageConfig {
  provider: "s3" | "oss" | "r2" | "cos" | "minio" | "local";
  endpoint?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  acl?: string;
  accountId?: string;
}

/** 读取当前默认对象存储配置，供同一 OSS 门面内的调用方校验能力。 */
export async function getActiveStorageConfig(): Promise<ActiveStorageConfig> {
  return (await getDefaultConfig()) as unknown as ActiveStorageConfig;
}

export async function getActiveStorage(env: unknown): Promise<StorageProvider> {
  const config = await getActiveStorageConfig();
  preventEmpty(config);

  const storage = getStorage(
    {
      provider: config.provider,
      endpoint: config.endpoint || undefined,
      region: config.region || undefined,
      accessKeyId: config.accessKey || "",
      secretAccessKey: config.secretKey || "",
      bucket: config.bucket || "",
      accountId: config.accountId || undefined,
    },
    env
  );

  preventStorageInitFailure(storage);
  return storage;
}

async function onList(
  params: FromSchema<typeof listReq>,
  _userObj: unknown,
  c: Context
): Promise<FromSchema<typeof listRes>> {
  const storage = await getActiveStorage(c.env);
  const result = await storage.list({
    prefix: params.keyword ? normalizePrefix(params.keyword) : undefined,
    limit: params.pageSize,
    cursor: params.cursor,
  });

  const list = result.objects.map(toFileVO);

  return cleanUndefined({
    list,
    total: list.length,
    pageSize: params.pageSize || 10,
    cursor: result.cursor,
    hasMore: result.isTruncated,
  }) as FromSchema<typeof listRes>;
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "List files in storage bucket",
  },
  adapter: bodyUserContextAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

async function onListDirectory(
  params: FromSchema<typeof listDirectoryReq>,
  _userObj: unknown,
  c: Context
): Promise<FromSchema<typeof listDirectoryRes>> {
  const storage = await getActiveStorage(c.env);
  const prefix = normalizePrefix(params.prefix);
  const result = await storage.list({
    prefix,
    delimiter: "/",
    limit: params.pageSize || 100,
    cursor: params.cursor,
  });

  const directories = (result.prefixes || []).map((itemPrefix) => {
    const normalized = normalizePrefix(itemPrefix);
    return {
      key: normalized,
      name: getNameFromPrefix(normalized),
      prefix: normalized,
    };
  });

  const files = result.objects
    .filter((item) => item.key !== prefix && !item.key.endsWith("/"))
    .map(toFileVO);

  return cleanUndefined({
    prefix,
    directories,
    files,
    pageSize: params.pageSize || 100,
    cursor: result.cursor,
    hasMore: result.isTruncated,
  }) as FromSchema<typeof listDirectoryRes>;
}

const listDirectoryApi = {
  req: listDirectoryReq,
  res: listDirectoryRes,
  pathInfo: {
    path: "/listDirectory",
    method: "post",
    summary: "List directories and files under a prefix",
  },
  adapter: bodyUserContextAdapter,
  service: onListDirectory,
  permission: { action: "read" },
} satisfies API;

async function onListAll(
  params: FromSchema<typeof listAllReq>,
  _userObj: unknown,
  c: Context
): Promise<FromSchema<typeof listAllRes>> {
  const storage = await getActiveStorage(c.env);
  const allObjects: StorageObjectMetadata[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await storage.list({
      prefix: params.keyword ? normalizePrefix(params.keyword) : undefined,
      limit: 1000,
      cursor,
    });
    allObjects.push(...result.objects);
    cursor = result.cursor;
    hasMore = result.isTruncated;
  }

  return cleanUndefined(allObjects.map(toFileVO)) as FromSchema<
    typeof listAllRes
  >;
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "List all files",
  },
  adapter: bodyUserContextAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

async function onGet(
  params: FromSchema<typeof getReq>,
  _userObj: unknown,
  c: Context
): Promise<FromSchema<typeof getRes>> {
  const storage = await getActiveStorage(c.env);
  const key = normalizeObjectKey(params.key);
  const meta = await storage.head(key);
  preventEmpty(meta);

  const downloadUrl = await storage.getPresignedGetUrl(key, {
    expiresIn: 3600,
  });

  return cleanUndefined({
    key: meta.key,
    size: meta.size,
    lastModified: meta.lastModified?.toISOString(),
    contentType: meta.contentType,
    downloadUrl,
  }) as FromSchema<typeof getRes>;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "Get file details and download URL",
  },
  adapter: bodyUserContextAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function onAdd(
  params: FromSchema<typeof addReq>,
  _userObj: unknown,
  c: Context
): Promise<FromSchema<typeof addRes>> {
  const storage = await getActiveStorage(c.env);
  const key = normalizeObjectKey(params.key);
  const url = await storage.getPresignedPutUrl(key, {
    contentType: params.contentType,
    expiresIn: params.expiresIn,
  });
  return { url, key };
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "Create an upload URL" },
  adapter: bodyUserContextAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: unknown,
  c: Context
): Promise<FromSchema<typeof updateRes>> {
  return onAdd(params, userObj, c);
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "Create an overwrite upload URL",
  },
  adapter: bodyUserContextAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

async function onDelete(
  params: FromSchema<typeof deleteReq>,
  _userObj: unknown,
  c: Context
): Promise<FromSchema<typeof deleteRes>> {
  const storage = await getActiveStorage(c.env);
  const key = normalizeObjectKey(params.key);
  await storage.delete(key);
  return { key };
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: { path: "/delete", method: "post", summary: "Delete file" },
  adapter: bodyUserContextAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

export const utils = {
  getActiveStorage,
  normalizeObjectKey,
  normalizePrefix,
};

export default {
  list: listApi,
  listDirectory: listDirectoryApi,
  listAll: listAllApi,
  get: getApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
};
