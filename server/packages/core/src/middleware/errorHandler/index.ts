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

export default function errorHandler(app: App) {
  // 移入函数内，避免模块加载副作用
  if (getRuntimeKey() !== "workerd") {
    process.on("uncaughtException", function (err) {
      console.error("uncaughtException:", err);
    });
  }

  console.log(`🚀 Server started in ${getEnv("NODE_ENV")} mode`);

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

    const isClientError = e instanceof HTTPException && e.status < 500;
    if (isClientError) {
      // 客户端错误或业务异常，仅打印简短日志，不输出完整堆栈以避免污染控制台
      const msg = `[BusinessWarning] ${e.message}`;
      if (c.var.logger && typeof c.var.logger.warn === "function") {
        c.var.logger.warn(msg);
      } else {
        console.warn(msg);
      }
    } else {
      // 服务端内部异常，保留完整堆栈
      if (c.var.logger && typeof c.var.logger.error === "function") {
        c.var.logger.error(err);
      } else {
        console.error(err);
      }
    }

    const t = await getTranslator(c);
    if (e instanceof HTTPException) {
      const is500 = e.status >= 500;
      const causeObj = e.cause as
        | {
            params?: any;
            error?: any;
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
