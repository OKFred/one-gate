import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  StorageProvider,
  StorageObjectMetadata,
  PresignedUrlOptions,
  StorageListOptions,
  StorageListResult,
  StoragePutBody,
  StoragePutOptions,
} from "../types";
import { applyAwsPolyfills } from "../awsPolyfill";

export interface R2ObjectMetadataLike {
  size: number;
  uploaded: Date;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBodyLike extends R2ObjectMetadataLike {
  body: ReadableStream;
}

export interface R2ListedObjectLike {
  key: string;
  size: number;
  uploaded: Date;
}

export interface R2ListResponseLike {
  objects: R2ListedObjectLike[];
  delimitedPrefixes?: string[];
  cursor?: string;
  truncated: boolean;
}

export interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: StoragePutBody,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<R2ObjectMetadataLike | null>;
  list(options?: StorageListOptions): Promise<R2ListResponseLike>;
}

export function isR2BucketLike(value: unknown): value is R2BucketLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "get" in value &&
    typeof (value as { get: unknown }).get === "function" &&
    "put" in value &&
    typeof (value as { put: unknown }).put === "function" &&
    "delete" in value &&
    typeof (value as { delete: unknown }).delete === "function" &&
    "head" in value &&
    typeof (value as { head: unknown }).head === "function" &&
    "list" in value &&
    typeof (value as { list: unknown }).list === "function"
  );
}

/**
 * Cloudflare R2 Provider
 * 使用 R2 绑定处理高效的数据操作，使用 S3 SDK 处理预签名 URL
 */
export class R2Provider implements StorageProvider {
  private bucket: R2BucketLike;
  private s3Client: S3Client;
  private bucketName: string;

  constructor(config: {
    bucketBinding: R2BucketLike;
    bucketName: string;
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    applyAwsPolyfills();
    if (!config.bucketBinding) {
      throw new Error("R2 bucket binding is required for R2Provider");
    }
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
      Metadata: options?.customMetadata,
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

  async get(key: string): Promise<ReadableStream | Uint8Array | Buffer | null> {
    const object = await this.bucket.get(key);
    return object ? object.body : null;
  }

  async put(
    key: string,
    body: StoragePutBody,
    options?: StoragePutOptions
  ): Promise<void> {
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
      customMetadata: object.customMetadata,
    };
  }

  async list(options?: StorageListOptions): Promise<StorageListResult> {
    const response = await this.bucket.list({
      prefix: options?.prefix,
      limit: options?.limit,
      cursor: options?.cursor,
      delimiter: options?.delimiter,
    });
    const objects = response.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded,
    }));
    return {
      objects,
      prefixes: Array.isArray(response.delimitedPrefixes)
        ? response.delimitedPrefixes
        : [],
      cursor: response.cursor,
      isTruncated: response.truncated,
    };
  }
}
