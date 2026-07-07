import { StorageProvider } from "./types";
import { S3Provider } from "./providers/s3";
import { R2Provider } from "./providers/r2";
import { Context } from "hono";
import { App } from "../../types/app";
import { utils as ossUtils } from "../../../../infra/src/data/oss/file/service";
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
  const bucketBinding = env[config.bucket] || env.BUCKET;

  // 仅在 R2 且存在原生绑定时使用 R2Provider
  if (provider === "R2" && config.accountId && bucketBinding) {
    return new R2Provider({
      bucketBinding,
      bucketName: config.bucket,
      accountId: config.accountId,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
  }

  // 否则一律使用 S3Provider (包含 R2 的 S3 兼容模式)
  let endpoint = config.endpoint;
  if (!endpoint && provider === "R2" && config.accountId) {
    endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  }

  return new S3Provider({
    endpoint: endpoint || "http://localhost:9000",
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
    c.set("getOSS", async () => await ossUtils.getActiveStorage(c.env));
    await next();
  });
};
