/**
 * 解析后端返回的校验错误 (JSON Schema 格式)
 * @param errorData 后端返回的 data 字段内容
 * @returns 字段名与错误信息的映射对象
 */
export function parseValidationErrors(errorData: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const data = errorData as
    | {
        cause?: Array<{
          instancePath?: string;
          instanceLocation?: string;
          message?: string;
          error?: string;
        }>;
      }
    | undefined;

  if (data?.cause && Array.isArray(data.cause)) {
    data.cause.forEach((item) => {
      // 兼容 instanceLocation (#/field) 和 instancePath (/field)
      const path = item.instanceLocation || item.instancePath || '';
      const pathParts = path.replace('#', '').split('/').filter(Boolean);
      const field = pathParts[pathParts.length - 1];

      // 兼容 error 和 message 字段
      const message = item.error || item.message;

      if (field && message) {
        fieldErrors[field] = message;
      }
    });
  }

  return fieldErrors;
}
