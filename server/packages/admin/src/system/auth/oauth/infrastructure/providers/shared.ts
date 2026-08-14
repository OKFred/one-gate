import {
  OAuthError,
  OAuthErrorCode,
  type JsonObject,
} from "../../domain/oauth.js";

export function toJsonObject(value: object): JsonObject {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_REJECTED,
      "OAuth Provider 返回的档案格式无效"
    );
  }
  return parsed as JsonObject;
}

export function splitScopes(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

export async function asProviderError<T>(
  providerName: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof OAuthError) throw error;
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_REJECTED,
      `${providerName} OAuth 请求失败`
    );
  }
}
