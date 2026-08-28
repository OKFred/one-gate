import { getRuntimeKey } from "hono/adapter";
import { getEnv } from "../../utils/env";
import type { App, Context, ResJson } from "../../types/app.ts";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { getTranslator } from "../../utils/i18n/index.js";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import { BusinessError } from "./businessError/index.js";
import { toHttpException } from "./businessError";
import { convertSqlErrorToBusinessError } from "./sqlError";

function readBusinessErrorCode(error: unknown): string | undefined {
  if (!(error instanceof HTTPException)) return undefined;
  const cause = error.cause;
  if (!cause || typeof cause !== "object" || !("error" in cause)) {
    return undefined;
  }
  const businessError = cause.error;
  if (
    !businessError ||
    typeof businessError !== "object" ||
    !("code" in businessError)
  ) {
    return undefined;
  }
  return typeof businessError.code === "string"
    ? businessError.code
    : undefined;
}

export default function errorHandler(app: App) {
  // 移入函数内，避免模块加载副作用
  if (getRuntimeKey() !== "workerd") {
    process.on("uncaughtException", function () {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          service: "hodor-server",
          event: "process.uncaught_exception",
          code: "UNCAUGHT_EXCEPTION",
        })
      );
    });
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "hodor-server",
      event: "service.started",
      runtime: getRuntimeKey(),
      environment: getEnv("NODE_ENV") ?? "unknown",
    })
  );

  app.notFound(async (c: Context) => {
    const t = await getTranslator(c);
    return c.json<ResJson<Record<string, never>>>(
      {
        ok: false,
        message: await t("errorHandler.notFound"),
        data: {},
      },
      { status: StatusCodes.NOT_FOUND as ContentfulStatusCode }
    );
  });

  app.openAPIRegistry.registerComponent("schemas", "ErrorInvalidRequest", {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      message: { type: "string" },
      data: { type: "object" },
    },
    required: ["ok", "message", "data"],
    additionalProperties: false,
  });

  app.onError(async (err, c: Context) => {
    let e = err;
    const sqlError = convertSqlErrorToBusinessError(e);
    if (sqlError) {
      e = toHttpException(sqlError);
    }
    if (e instanceof BusinessError) {
      e = toHttpException(e);
    }

    const status = e instanceof HTTPException ? e.status : 500;
    const businessCode = readBusinessErrorCode(e);
    const requestId = c.get("requestId") || crypto.randomUUID();
    const errorEvent = {
      timestamp: new Date().toISOString(),
      level: status < 500 ? ("warn" as const) : ("error" as const),
      service: "hodor-server",
      event: "http.request.failed",
      requestId,
      method: c.req.method,
      route: c.req.routePath || "unmatched",
      status,
      code:
        businessCode ?? (status < 500 ? `HTTP_${status}` : "INTERNAL_ERROR"),
    };
    if (c.var.logger) {
      c.var.logger[errorEvent.level](errorEvent);
    } else {
      const line = JSON.stringify(errorEvent);
      if (errorEvent.level === "warn") {
        console.warn(line);
      } else {
        console.error(line);
      }
    }
    c.header("x-request-id", requestId);

    const t = await getTranslator(c);
    if (e instanceof HTTPException) {
      const is500 = e.status >= 500;
      const causeObj = e.cause as
        | {
            params?: any;
            error?: { code?: unknown };
            details?: {
              type: string;
              message: string;
              params?: Record<string, any>;
            }[];
          }
        | undefined;

      let rawDetails: {
        type: string;
        message: string;
        params?: Record<string, any>;
      }[] = [];
      if (!is500 && causeObj) {
        if (Array.isArray(causeObj.details)) {
          rawDetails = causeObj.details;
        } else if (
          causeObj.params &&
          typeof causeObj.params.message === "string"
        ) {
          rawDetails = [
            {
              type: causeObj.params.type || "detail_error",
              message: causeObj.params.message,
              params: causeObj.params.params,
            },
          ];
        }
      }

      // 对 rawDetails 中的每一项异步做多语言插值翻译
      const details = await Promise.all(
        rawDetails.map(async (d) => ({
          type: d.type,
          message: await t(d.message, d.params),
        }))
      );

      return c.json<ResJson>(
        {
          ok: false,
          message: await t(e.message),
          data: {
            code:
              typeof causeObj?.error?.code === "string"
                ? causeObj.error.code
                : undefined,
            details,
          },
        },
        { status: e.status as ContentfulStatusCode }
      );
    }
    return c.json<ResJson>(
      {
        ok: false,
        message: await t("errorHandler.unknownError"),
        data: {
          details: [],
        },
      },
      { status: StatusCodes.INTERNAL_SERVER_ERROR as ContentfulStatusCode }
    );
  });
}
