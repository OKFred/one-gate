import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StorageProvider,
  StorageObjectMetadata,
  PresignedUrlOptions,
} from "../types";

/**
 * Cloudflare R2 Provider
 * 使用 R2 绑定处理高效的数据操作，使用 S3 SDK 处理预签名 URL
 */
export class R2Provider implements StorageProvider {
  private bucket: any; // R2Bucket
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: {
    bucketBinding: any; // c.env.BUCKET
    bucketName: string;
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    this.bucket = config.bucketBinding;
    this.bucketName = config.bucketName;

    // R2 的 S3 兼容 Endpoint
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async getPresignedPutUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: options?.contentType,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: options?.expiresIn || 3600,
    });
  }

  async getPresignedGetUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: options?.expiresIn || 3600,
    });
  }

  async get(key: string): Promise<any> {
    const object = await this.bucket.get(key);
    return object ? object.body : null;
  }

  async put(key: string, body: any, options?: any): Promise<void> {
    await this.bucket.put(key, body, {
      httpMetadata: {
        contentType: options?.contentType,
      },
      customMetadata: options?.customMetadata,
    });
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async head(key: string): Promise<StorageObjectMetadata | null> {
    const object = await this.bucket.head(key);
    if (!object) return null;
    return {
      key,
      size: object.size,
      contentType: object.httpMetadata?.contentType,
      lastModified: object.uploaded,
    };
  }

  async list(prefix?: string): Promise<StorageObjectMetadata[]> {
    const response = await this.bucket.list({ prefix });
    return response.objects.map((obj: any) => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded,
    }));
  }
}
