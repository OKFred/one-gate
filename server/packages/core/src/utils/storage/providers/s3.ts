import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StorageProvider,
  StorageObjectMetadata,
  PresignedUrlOptions,
  StorageListOptions,
  StorageListResult,
} from "../types";
import { applyAwsPolyfills } from "../awsPolyfill";

/** 判断 S3 异常是否仅表示目标对象不存在，而不是 Bucket 不存在。 */
export function isMissingS3ObjectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return false;
  }
  const record = error as Record<string, unknown>;
  const codes = [record.name, record.code, record.Code].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (codes.includes("NoSuchBucket")) return false;
  if (codes.includes("NotFound") || codes.includes("NoSuchKey")) return true;
  const metadata = record.$metadata;
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return false;
  }
  return (metadata as Record<string, unknown>).httpStatusCode === 404;
}

export class S3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    applyAwsPolyfills();
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true, // 兼容 rustfs/MinIO
    });
    this.bucket = config.bucket;
  }

  async getPresignedPutUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: options?.contentType,
      Metadata: options?.customMetadata,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn || 3600,
    });
  }

  async getPresignedGetUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn || 3600,
    });
  }

  async get(key: string): Promise<any> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    return response.Body;
  }

  async put(key: string, body: any, options?: any): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: options?.contentType,
    });
    await this.client.send(command);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async head(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      return {
        key,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        customMetadata: response.Metadata,
      };
    } catch (error: unknown) {
      if (isMissingS3ObjectError(error)) return null;
      throw error;
    }
  }

  async list(options?: StorageListOptions): Promise<StorageListResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: options?.prefix,
      MaxKeys: options?.limit,
      ContinuationToken: options?.cursor,
      Delimiter: options?.delimiter,
    });
    const response = await this.client.send(command);
    const objects = (response.Contents || []).map((item) => ({
      key: item.Key!,
      size: item.Size,
      lastModified: item.LastModified,
    }));
    return {
      objects,
      prefixes: (response.CommonPrefixes || [])
        .map((item) => item.Prefix)
        .filter((prefix): prefix is string => !!prefix),
      cursor: response.NextContinuationToken,
      isTruncated: !!response.IsTruncated,
    };
  }
}
