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
} from "../types";

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
      };
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  async list(prefix?: string): Promise<StorageObjectMetadata[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    return (response.Contents || []).map((item) => ({
      key: item.Key!,
      size: item.Size,
      lastModified: item.LastModified,
    }));
  }
}
