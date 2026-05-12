import { getRuntimeKey } from "hono/adapter";
import { getEnv } from "@/utils/env";
import type { App, Context, ResJson } from "@/types/app.ts";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { getTranslator } from "@/utils/i18n";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import { BusinessError } from "@/middleware/errorHandler/businessError/index";
import { toHttpException } from "./businessError";
import { convertSqlErrorToBusinessError } from "./sqlError";

export default function errorHandler(app: App) {
  app.notFound(async (c: Context) => {
    const t = await getTranslator(c);
    return c.json<ResJson<null>>(
      {
        ok: false,
        message: await t("errorHandler.notFound"),
        data: null,
      },
      { status: StatusCodes.NOT_FOUND as ContentfulStatusCode }
    );
  });

  app.openAPIRegistry.registerComponent("schemas", "ErrorInvalidRequest", {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      message: { type: "string" },
      data: { type: "object", nullable: true },
    },
    required: ["ok", "message", "data"],
    additionalProperties: false,
  });

  app.onError(async (err, c: Context) => {
    if (c.var.logger) {
      c.var.logger.error(err);
    } else {
      console.error(err);
    }
    const t = await getTranslator(c);
    let e = err;
    const sqlError = convertSqlErrorToBusinessError(e);
    if (sqlError) {
      e = toHttpException(sqlError);
    }
    if (e instanceof BusinessError) {
      e = toHttpException(e);
    }
    if (e instanceof HTTPException) {
      return c.json<ResJson>(
        {
          ok: false,
          message: await t(e.message),
          data: (e.cause as any)?.params || null,
        },
        { status: e.status as ContentfulStatusCode }
      );
    }
    return c.json<ResJson<null>>(
      {
        ok: false,
        message: await t("errorHandler.unknownError"),
        data: null,
      },
      { status: StatusCodes.INTERNAL_SERVER_ERROR as ContentfulStatusCode }
    );
  });
}

/**
 * @description: 未捕获异常处理
 */
getRuntimeKey() !== "workerd" &&
  process.on("uncaughtException", function (err) {
    console.error("uncaughtException:", err);
  });

console.log(`🚀 Server started in ${getEnv("NODE_ENV")} mode`);
