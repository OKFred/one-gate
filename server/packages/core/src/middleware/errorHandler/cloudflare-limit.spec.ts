import { OpenAPIHono } from "@hono/zod-openapi";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { HTTPException } from "hono/http-exception";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppBindings } from "../../types/app";
import { getEnv, setEnv } from "../../utils/env";
import errorHandler from "./index";
import { BusinessError, BusinessErrorCode } from "./businessError";
import {
  classifyCloudflareLimit,
  cloudflareLimitMessage,
  CLOUDFLARE_LIMIT_PRESENTATIONS,
  type CloudflareLimitCode,
} from "./cloudflare-limit";

const translations = vi.hoisted(() => ({
  unavailable: false,
  getTranslator: vi.fn(async () => {
    if (translations.unavailable)
      throw new Error("Synthetic D1/KV translation dependency unavailable");
    return async (key: string) => key;
  }),
}));
vi.mock("../../utils/i18n/index.js", () => ({
  getTranslator: translations.getTranslator,
}));

const dailyRead =
  "Your account has exceeded D1's free tier daily row read limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue. See https://developers.cloudflare.com/d1/platform/limits/ for more details.";
const dailyWrite = dailyRead.replace("row read", "row write");
const originalLocale = getEnv("LOCALE");
const app = new OpenAPIHono<AppBindings>();
let thrown: Error = new Error("Synthetic failure");
let metadataLogs: string[] = [];
app.use("*", async (context, next) => {
  context.set("requestId", "synthetic-limit-request");
  await next();
});
errorHandler(app);
app.post("/api/v1/admin/system/auth/login", () => {
  throw thrown;
});

function request(headers: Record<string, string> = {}) {
  return app.request("/api/v1/admin/system/auth/login", {
    method: "POST",
    headers,
  });
}

describe("Cloudflare limit classification", () => {
  it.each<[string, CloudflareLimitCode]>([
    [dailyRead, "CLOUDFLARE_D1_DAILY_READ_LIMIT"],
    [`D1_ERROR: ${dailyWrite}`, "CLOUDFLARE_D1_DAILY_WRITE_LIMIT"],
    [
      "D1_ERROR: Your account has exceeded D1's maximum account storage limit, please contact Cloudflare to raise your limit",
      "CLOUDFLARE_D1_STORAGE_LIMIT",
    ],
    ["D1_ERROR: Exceeded maximum DB size.", "CLOUDFLARE_D1_STORAGE_LIMIT"],
    ["KV PUT failed: 429 Too Many Requests", "CLOUDFLARE_KV_RATE_LIMITED"],
    ["KV GET failed: 429 Too Many Requests", "CLOUDFLARE_KV_RATE_LIMITED"],
    [
      "You have exceeded the daily Cloudflare Workers KV free tier limit of 1000 Workers KV put operations.",
      "CLOUDFLARE_KV_QUOTA_EXCEEDED",
    ],
    ["Worker exceeded resource limits", "CLOUDFLARE_WORKERS_RESOURCE_LIMIT"],
  ])("classifies the explicit provider message %s", (message, code) => {
    expect(classifyCloudflareLimit(new Error(message))).toBe(code);
  });

  it.each([
    "D1_ERROR: Network connection lost.",
    "D1 DB is overloaded. Too many requests queued.",
    "D1 DB exceeded its CPU time limit and was reset.",
    "Exceeded maximum DB size.",
    "429 Too Many Requests",
    "KV PUT failed: 500 Internal Server Error",
    "SQLITE_BUSY: database is locked",
    "Error 1027",
    "Error 1102",
    "Too many requests",
    `Failed query: select '${dailyRead}'`,
  ])("does not guess a quota from %s", (message) => {
    expect(classifyCloudflareLimit(new Error(message))).toBeNull();
  });

  it("finds the official D1 error through actual Drizzle wrappers", () => {
    const error = new DrizzleQueryError(
      "select private_column from private_table where credential = ?",
      ["synthetic-sensitive-parameter"],
      new Error(`D1_ERROR: ${dailyRead}`)
    );
    expect(classifyCloudflareLimit(error)).toBe(
      "CLOUDFLARE_D1_DAILY_READ_LIMIT"
    );
  });

  it("bounds the traversal and handles circular causes", () => {
    const circular: { message: string; cause?: object } = {
      message: "ordinary",
    };
    circular.cause = circular;
    expect(classifyCloudflareLimit(circular)).toBeNull();
    let wrapped = new Error(dailyRead);
    for (let depth = 0; depth < 6; depth += 1)
      wrapped = new Error("outer", { cause: wrapped });
    expect(classifyCloudflareLimit(wrapped)).toBeNull();
  });

  it("does not invoke getters, coercion, or proxy property traps", () => {
    const getter = vi.fn(() => {
      throw new Error("must not execute");
    });
    const error = Object.defineProperties(
      {},
      {
        message: { get: getter },
        cause: { get: getter },
        toString: { value: getter },
      }
    );
    expect(classifyCloudflareLimit(error)).toBeNull();
    expect(getter).not.toHaveBeenCalled();
    expect(
      classifyCloudflareLimit(
        new Proxy({}, { getOwnPropertyDescriptor: getter })
      )
    ).toBeNull();
    expect(getter).toHaveBeenCalledTimes(2);
  });

  it("provides every stable code with dependency-free bilingual text", () => {
    for (const code of Object.keys(
      CLOUDFLARE_LIMIT_PRESENTATIONS
    ) as CloudflareLimitCode[]) {
      expect(cloudflareLimitMessage(code, "zh-CN,zh;q=0.9")).toContain(
        "Cloudflare"
      );
      expect(cloudflareLimitMessage(code, "en-GB")).toContain("Cloudflare");
      expect(cloudflareLimitMessage(code, "zh-CN")).not.toBe(
        cloudflareLimitMessage(code, "en-US")
      );
    }
  });
});

describe("global login error response without D1/KV translations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    translations.getTranslator.mockClear();
    translations.unavailable = false;
    metadataLogs = [];
    vi.spyOn(console, "error").mockImplementation((line: unknown) => {
      metadataLogs.push(String(line));
    });
    vi.spyOn(console, "warn").mockImplementation((line: unknown) => {
      metadataLogs.push(String(line));
    });
    setEnv({ LOCALE: "zh-CN" });
  });
  afterAll(() => {
    vi.restoreAllMocks();
    setEnv({ LOCALE: originalLocale });
  });

  it.each([
    [dailyRead, "CLOUDFLARE_D1_DAILY_READ_LIMIT", 503],
    [dailyWrite, "CLOUDFLARE_D1_DAILY_WRITE_LIMIT", 503],
    ["KV PUT failed: 429 Too Many Requests", "CLOUDFLARE_KV_RATE_LIMITED", 429],
    [
      "Worker exceeded resource limits",
      "CLOUDFLARE_WORKERS_RESOURCE_LIMIT",
      503,
    ],
  ] as const)(
    "returns a safe actionable response for %s",
    async (message, code, status) => {
      translations.unavailable = true;
      thrown = new DrizzleQueryError(
        "select private_column from private_table where credential = ?",
        ["synthetic-sensitive-parameter"],
        new Error(message)
      );
      const response = await request();
      const body = await response.json();
      expect(response.status).toBe(status);
      expect(response.headers.get("x-request-id")).toBe(
        "synthetic-limit-request"
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(body).toEqual({
        ok: false,
        message: cloudflareLimitMessage(code, "zh-CN"),
        data: { code, details: [] },
      });
      expect(translations.getTranslator).not.toHaveBeenCalled();
      const report = JSON.stringify({ body, logs: metadataLogs });
      expect(report).not.toContain("private_column");
      expect(report).not.toContain("private_table");
      expect(report).not.toContain("synthetic-sensitive-parameter");
      expect(metadataLogs).toHaveLength(1);
      expect(metadataLogs[0]).toContain(code);
    }
  );

  it("uses the request language before an authenticated identity exists", async () => {
    translations.unavailable = true;
    thrown = new Error(dailyRead);
    const response = await request({ "Accept-Language": "en-US,en;q=0.9" });
    expect((await response.json()).message).toBe(
      cloudflareLimitMessage("CLOUDFLARE_D1_DAILY_READ_LIMIT", "en-US")
    );
    expect(translations.getTranslator).not.toHaveBeenCalled();
  });

  it("preserves intentional business errors even when metadata resembles provider text", async () => {
    thrown = new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: dailyRead,
    });
    const response = await request();
    expect(response.status).toBe(400);
    expect((await response.json()).data.code).toBe("INVALID_PARAMS");
    expect(translations.getTranslator).toHaveBeenCalledTimes(1);
  });

  it("preserves explicit HTTP errors instead of treating their text as provider proof", async () => {
    thrown = new HTTPException(429, { message: dailyRead });
    const response = await request();
    expect(response.status).toBe(429);
    expect((await response.json()).data.code).toBeUndefined();
  });

  it("retains the ordinary unknown error response", async () => {
    thrown = new Error("Synthetic unrelated exception");
    const response = await request();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      message: "errorHandler.unknownError",
      data: { details: [] },
    });
  });
});
