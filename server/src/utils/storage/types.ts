/**
 * Storage Service Types and Interface
 */

export interface StorageObjectMetadata {
  key: string;
  size?: number;
  contentType?: string;
  lastModified?: Date;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // 秒
  contentType?: string;
}

export interface StorageListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
  delimiter?: string;
}

export interface StorageListResult {
  objects: StorageObjectMetadata[];
  prefixes?: string[];
  cursor?: string;
  isTruncated: boolean;
}

export interface StorageProvider {
  /**
   * 生成预签名上传链接 (PUT)
   * 用于客户端直传
   */
  getPresignedPutUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string>;

  /**
   * 生成预签名访问链接 (GET)
   */
  getPresignedGetUrl(
    key: string,
    options?: PresignedUrlOptions
  ): Promise<string>;

  /**
   * 获取对象内容
   */
  get(key: string): Promise<ReadableStream | Buffer | null>;

  /**
   * 上传对象 (服务器端)
   */
  put(key: string, body: any, options?: any): Promise<void>;

  /**
   * 删除对象
   */
  delete(key: string): Promise<void>;

  /**
   * 检查对象是否存在并返回元数据
   */
  head(key: string): Promise<StorageObjectMetadata | null>;

  /**
   * 列出对象
   */
  list(options?: StorageListOptions): Promise<StorageListResult>;
}
