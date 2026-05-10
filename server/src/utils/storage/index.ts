import { StorageProvider } from "./types";
import { S3Provider } from "./providers/s3";
import { R2Provider } from "./providers/r2";
import { Context } from "hono";
import { App } from "@/types/app";
import { utils as ossUtils } from "@/api/oss/file/service";
/**
 * OSS 配置接口
 */
export interface OssConfig {
  provider: string; // 适配数据库中的 "r2" / "s3"
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  accountId?: string; // 仅 R2 需要
}

/**
 * 初始化存储驱动 (支持传入配置对象或从环境变量读取)
 */
export function getStorage(config: OssConfig, env: any = {}): StorageProvider {
  const provider = config.provider.toUpperCase();

  if (provider === "R2" && config.accountId) {
    // 在 R2 模式下，config.bucket 存储的是 Binding 名称 (如 "BUCKET")
    const bucketBinding = env[config.bucket] || env.BUCKET;

    return new R2Provider({
      bucketBinding,
      bucketName: config.bucket, // R2 S3 SDK 仍需要逻辑上的存储桶名 (通常在 CF 后台定义)
      accountId: config.accountId,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
  }

  return new S3Provider({
    endpoint: config.endpoint || "http://localhost:9000",
    region: config.region || "auto",
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    bucket: config.bucket,
  });
}

/**
 * Hono 中间件：默认注入 (如果需要默认配置)
 */
export const storageMiddleware = (app: App) => {
  app.use("*", async (c: Context, next) => {
    c.set("OSS", async () => await ossUtils.getActiveStorage(c.env));
    await next();
  });
};
