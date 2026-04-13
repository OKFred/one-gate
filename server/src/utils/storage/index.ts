import { getEnv } from "../env";
import { StorageProvider } from "./types";
import { S3Provider } from "./providers/s3";
import { R2Provider } from "./providers/r2";
import { Context, MiddlewareHandler } from "hono";
import { getRuntimeKey } from "hono/adapter";

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
export function initStorage(
  config?: OssConfig,
  env: any = {}
): StorageProvider {
  const runtime = getRuntimeKey();

  // 如果提供了配置对象，则优先使用
  if (config) {
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

  // 备选方案：从环境变量初始化 (保留之前的逻辑作为回退)
  if (runtime === "workerd") {
    const accountId = env.OSS_ACCOUNT_ID || getEnv("OSS_ACCOUNT_ID");
    const bucketName = env.OSS_BUCKET || getEnv("OSS_BUCKET");
    const accessKeyId = env.OSS_ACCESS_KEY || getEnv("OSS_ACCESS_KEY");
    const secretAccessKey = env.OSS_SECRET_KEY || getEnv("OSS_SECRET_KEY");
    const bucketBinding = env.BUCKET;

    if (bucketBinding && accountId && accessKeyId && secretAccessKey) {
      return new R2Provider({
        bucketBinding,
        bucketName,
        accountId,
        accessKeyId,
        secretAccessKey,
      });
    }
  }

  return new S3Provider({
    endpoint: env.OSS_ENDPOINT || getEnv("OSS_ENDPOINT"),
    region: env.OSS_REGION || getEnv("OSS_REGION"),
    accessKeyId: env.OSS_ACCESS_KEY || getEnv("OSS_ACCESS_KEY"),
    secretAccessKey: env.OSS_SECRET_KEY || getEnv("OSS_SECRET_KEY"),
    bucket: env.OSS_BUCKET || getEnv("OSS_BUCKET"),
  });
}

/**
 * 存储工厂，用于获取实例
 */
export function getStorage(config?: OssConfig, env?: any): StorageProvider {
  return initStorage(config, env);
}

/**
 * Hono 中间件：默认注入 (如果需要默认配置)
 */
export const storageMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next) => {
    const storage = getStorage(undefined, c.env);
    c.set("storage", storage);
    await next();
  };
};
