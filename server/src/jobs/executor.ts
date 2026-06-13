/**
 * API Task HTTP 执行器与定时任务解耦执行器
 * 基于 fetch() 标准 API，兼容 Node.js 18+ 和 Cloudflare Workers
 */

import { AppDatabase } from "@/db/index";
import { jobsRegistry } from "./registry";
import { apiTaskTable } from "@/api/maintenance/api-task/model";
import { eq, and } from "drizzle-orm";

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
  headers?: Record<string, string>;
  statusText?: string;
  url?: string;
  redirected?: boolean;
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
  // 拼接 baseUrl 和 path，保留 baseUrl 中的路径后缀（例如 /v2）
  let fullUrlStr = task.baseUrl;
  if (fullUrlStr.endsWith("/") && task.path.startsWith("/")) {
    fullUrlStr += task.path.slice(1);
  } else if (!fullUrlStr.endsWith("/") && !task.path.startsWith("/")) {
    fullUrlStr += "/" + task.path;
  } else {
    fullUrlStr += task.path;
  }
  const url = new URL(fullUrlStr);
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

  // GET / DELETE → 参数追加 to query string，其他 → JSON body
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
    const resHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      resHeaders[key] = value;
    });

    return {
      statusCode: res.status,
      responseBody,
      success: res.ok,
      headers: resHeaders,
      statusText: res.statusText,
      url: res.url,
      redirected: res.redirected,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return {
      statusCode: isTimeout ? 408 : 0,
      responseBody: message,
      success: false,
      headers: {},
      statusText: isTimeout ? "Request Timeout" : "Network Error",
      url: url.toString(),
      redirected: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface JobExecutorResult {
  status: boolean; // true: 成功, false: 失败
  errorMessage?: string | null;
  responseBody?: string | null;
}

export interface JobExecutor {
  /**
   * 判断当前执行器是否支持处理该任务
   */
  supports(jobKey: string): Promise<boolean> | boolean;

  /**
   * 执行具体的任务逻辑
   */
  execute(
    job: { jobKey: string; parameters?: string | null; name: string },
    db: AppDatabase
  ): Promise<JobExecutorResult>;
}

/**
 * 内置静态任务执行器
 */
export class StaticJobExecutor implements JobExecutor {
  supports(jobKey: string): boolean {
    return !!jobsRegistry[jobKey];
  }

  async execute(
    job: { jobKey: string; parameters?: string | null; name: string },
    db: AppDatabase
  ): Promise<JobExecutorResult> {
    const handler = jobsRegistry[job.jobKey];
    if (!handler) {
      return {
        status: false,
        errorMessage: `Static handler not found for key: ${job.jobKey}`,
      };
    }
    try {
      const params = job.parameters ? JSON.parse(job.parameters) : {};
      await handler({ params, db });
      return { status: true };
    } catch (err: unknown) {
      return {
        status: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/**
 * HTTP 动态 API 任务执行器
 */
export class HttpJobExecutor implements JobExecutor {
  supports(jobKey: string): boolean {
    // 作为兜底执行器
    return true;
  }

  async execute(
    job: { jobKey: string; parameters?: string | null; name: string },
    db: AppDatabase
  ): Promise<JobExecutorResult> {
    const apiTasks = await db
      .select()
      .from(apiTaskTable)
      .where(
        and(
          eq(apiTaskTable.taskKey, job.jobKey),
          eq(apiTaskTable.isEnabled, true)
        )
      )
      .limit(1);

    const apiTask = apiTasks[0];
    if (!apiTask) {
      return {
        status: false,
        errorMessage: `Job key "${job.jobKey}" 未在静态注册表中找到，也未找到匹配的 API Task 定义。`,
      };
    }

    try {
      const params: Record<string, unknown> = job.parameters
        ? JSON.parse(job.parameters)
        : {};
      const result = await executeApiTask(apiTask, params);
      if (result.success) {
        return {
          status: true,
          responseBody: result.responseBody,
        };
      } else {
        return {
          status: false,
          errorMessage: `HTTP ${result.statusCode}: ${result.responseBody.slice(0, 500)}`,
          responseBody: result.responseBody,
        };
      }
    } catch (err: unknown) {
      return {
        status: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const jobExecutors: JobExecutor[] = [
  new StaticJobExecutor(),
  new HttpJobExecutor(),
];
