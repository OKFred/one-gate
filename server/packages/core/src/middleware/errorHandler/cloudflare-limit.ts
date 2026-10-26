/** Safe, dependency-free presentations: D1/KV can be unavailable during login. */
export const CLOUDFLARE_LIMIT_PRESENTATIONS = {
  CLOUDFLARE_D1_DAILY_READ_LIMIT: {
    status: 503,
    resource: "d1",
    i18nKey: "errorHandler.cloudflareD1DailyReadLimit",
    messages: {
      "zh-CN":
        "Cloudflare D1 今日读取额度已用尽，服务暂不可用。请在 UTC 00:00 额度重置后重试，或联系管理员调整套餐。",
      "en-US":
        "Cloudflare D1's daily read allowance is exhausted. Try again after the midnight UTC reset, or contact an administrator about the plan.",
    },
  },
  CLOUDFLARE_D1_DAILY_WRITE_LIMIT: {
    status: 503,
    resource: "d1",
    i18nKey: "errorHandler.cloudflareD1DailyWriteLimit",
    messages: {
      "zh-CN":
        "Cloudflare D1 今日写入额度已用尽，服务暂不可用。请在 UTC 00:00 额度重置后重试，或联系管理员调整套餐。",
      "en-US":
        "Cloudflare D1's daily write allowance is exhausted. Try again after the midnight UTC reset, or contact an administrator about the plan.",
    },
  },
  CLOUDFLARE_D1_STORAGE_LIMIT: {
    status: 503,
    resource: "d1",
    i18nKey: "errorHandler.cloudflareD1StorageLimit",
    messages: {
      "zh-CN":
        "Cloudflare D1 存储空间已达上限，服务暂不可用。请联系管理员检查数据库容量与套餐。",
      "en-US":
        "Cloudflare D1's storage limit has been reached. Contact an administrator to check database capacity and the plan.",
    },
  },
  CLOUDFLARE_KV_QUOTA_EXCEEDED: {
    status: 503,
    resource: "kv",
    i18nKey: "errorHandler.cloudflareKvQuotaExceeded",
    messages: {
      "zh-CN":
        "Cloudflare KV 使用额度已用尽，服务暂不可用。请联系管理员检查额度与重置时间。",
      "en-US":
        "Cloudflare KV's usage allowance is exhausted. Contact an administrator to check the allowance and reset time.",
    },
  },
  CLOUDFLARE_KV_RATE_LIMITED: {
    status: 429,
    resource: "kv",
    i18nKey: "errorHandler.cloudflareKvRateLimited",
    messages: {
      "zh-CN":
        "Cloudflare KV 请求受限，服务暂不可用。请稍后重试；若持续出现，请联系管理员检查额度和访问频率。",
      "en-US":
        "Cloudflare KV is limiting requests. Try again later; if this continues, contact an administrator to check usage and request frequency.",
    },
  },
  CLOUDFLARE_WORKERS_DAILY_LIMIT: {
    status: 503,
    resource: "workers",
    i18nKey: "errorHandler.cloudflareWorkersDailyLimit",
    messages: {
      "zh-CN":
        "Cloudflare Workers 今日请求额度已用尽，服务暂不可用。请在额度重置后重试，或联系管理员调整套餐。",
      "en-US":
        "Cloudflare Workers' daily request allowance is exhausted. Try again after the allowance resets, or contact an administrator about the plan.",
    },
  },
  CLOUDFLARE_WORKERS_RESOURCE_LIMIT: {
    status: 503,
    resource: "workers",
    i18nKey: "errorHandler.cloudflareWorkersResourceLimit",
    messages: {
      "zh-CN":
        "Cloudflare Workers 执行资源已达上限，服务暂不可用。请联系管理员检查 CPU、内存和运行限制。",
      "en-US":
        "Cloudflare Workers reached an execution resource limit. Contact an administrator to check CPU, memory, and runtime limits.",
    },
  },
} as const;

export type CloudflareLimitCode = keyof typeof CLOUDFLARE_LIMIT_PRESENTATIONS;

export function isCloudflareLimitCode(
  code: string | undefined
): code is CloudflareLimitCode {
  return (
    code !== undefined &&
    Object.prototype.hasOwnProperty.call(CLOUDFLARE_LIMIT_PRESENTATIONS, code)
  );
}

export function cloudflareLimitMessage(
  code: CloudflareLimitCode,
  language: string | undefined
): string {
  const languageTag = language?.split(",")[0]?.split(";")[0]?.trim();
  return CLOUDFLARE_LIMIT_PRESENTATIONS[code].messages[
    languageTag?.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US"
  ];
}

function ownData(value: object, key: string): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function classifyMessage(message: string): CloudflareLimitCode | null {
  // Full provider text may include remediation; inspect only its bounded prefix.
  const bounded = message.slice(0, 2048).trim();
  const d1Message = bounded.replace(/^D1_(?:EXEC_)?ERROR:\s*/, "");
  // Official D1 error sentences. Do not inspect an outer Drizzle SQL/params string.
  // https://developers.cloudflare.com/d1/observability/debug-d1/
  if (
    d1Message.startsWith(
      "Your account has exceeded D1's free tier daily row read limit."
    )
  )
    return "CLOUDFLARE_D1_DAILY_READ_LIMIT";
  if (
    d1Message.startsWith(
      "Your account has exceeded D1's free tier daily row write limit."
    )
  )
    return "CLOUDFLARE_D1_DAILY_WRITE_LIMIT";
  if (
    d1Message.startsWith(
      "Your account has exceeded D1's maximum account storage limit"
    ) ||
    (d1Message !== bounded && d1Message === "Exceeded maximum DB size.")
  )
    return "CLOUDFLARE_D1_STORAGE_LIMIT";
  // The 429 status alone does not distinguish a daily quota from hot-key writes.
  // https://github.com/cloudflare/workerd/blob/main/src/workerd/api/kv.c++
  if (
    /^KV (?:GET|PUT|DELETE|LIST) failed: 429 Too Many Requests\.?$/.test(
      bounded
    )
  )
    return "CLOUDFLARE_KV_RATE_LIMITED";
  // Compatibility with an explicitly reported daily-quota message; KV docs do
  // not guarantee a stable daily error format. A generic 429 stays rate-limited.
  if (
    /^You have exceeded the daily Cloudflare Workers KV free tier limit of \d+ Workers KV (?:get|put|delete|list) operations\.$/.test(
      bounded
    )
  )
    return "CLOUDFLARE_KV_QUOTA_EXCEEDED";
  // Platform-generated 1027/1102 pages are handled by the client when readable;
  // do not treat arbitrary exception numeric codes as Cloudflare error codes.
  if (/^Worker exceeded resource limits\.?$/.test(bounded))
    return "CLOUDFLARE_WORKERS_RESOURCE_LIMIT";
  return null;
}

/** Never serialize an unknown error, execute a getter, or traverse an unbounded cause. */
export function classifyCloudflareLimit(
  error: unknown
): CloudflareLimitCode | null {
  const visited = new Set<object>();
  let current = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || typeof current !== "object" || visited.has(current)) break;
    visited.add(current);
    const message = ownData(current, "message");
    if (typeof message === "string") {
      const code = classifyMessage(message);
      if (code) return code;
    }
    current = ownData(current, "cause");
  }
  return null;
}
