/**
 * API Task HTTP 执行器
 * 基于 fetch() 标准 API，兼容 Node.js 18+ 和 Cloudflare Workers
 */

export interface ApiTaskDef {
  baseUrl: string;
  path: string;
  method: string;
  headers?: string | null; // JSON 字符串
  timeoutMs?: number | null;
}

export interface ApiTaskResult {
  statusCode: number;
  responseBody: string;
  success: boolean;
}

/**
 * 执行一个 API Task HTTP 请求
 * @param task   任务定义（来自数据库）
 * @param params 请求参数（GET → query string，其他 → JSON body）
 */
export async function executeApiTask(
  task: ApiTaskDef,
  params: Record<string, unknown>
): Promise<ApiTaskResult> {
  const url = new URL(task.path, task.baseUrl);
  const method = task.method.toUpperCase();

  // 合并默认请求头
  const headersInit: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (task.headers) {
    try {
      const extra = JSON.parse(task.headers) as Record<string, string>;
      Object.assign(headersInit, extra);
    } catch {
      // 忽略无效 headers JSON，继续执行
    }
  }

  // GET / DELETE → 参数追加到 query string，其他 → JSON body
  let body: string | undefined;
  if (method === "GET" || method === "DELETE") {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  } else {
    body = JSON.stringify(params);
  }

  const controller = new AbortController();
  const timeoutMs = task.timeoutMs ?? 30_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method,
      headers: headersInit,
      body,
      signal: controller.signal,
    });

    const responseBody = await res.text();
    return {
      statusCode: res.status,
      responseBody,
      success: res.ok,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return {
      statusCode: isTimeout ? 408 : 0,
      responseBody: message,
      success: false,
    };
  } finally {
    clearTimeout(timer);
  }
}
