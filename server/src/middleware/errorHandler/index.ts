import { getRuntimeKey } from "hono/adapter";
import { getEnv } from "@/utils/env";
import type { App, Context, ResJson } from "@/types/app.ts";
import { getTranslator } from "@/utils/i18n";
// import { sendFeishuMessage } from "@/rpc/feishu/instance";
import { HTTPException } from "hono/http-exception";
import { type ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";
import { BusinessError } from "@/middleware/errorHandler/businessError/index";
import { toHttpException } from "./businessError";
import { convertSqlErrorToBusinessError } from "./sqlError";

type HTTPExceptionConstructorParams = Required<
  ConstructorParameters<typeof HTTPException>
>;
type HTTPExceptionOptions = Required<HTTPExceptionConstructorParams[1]>; // 提取第二个参数的类型

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
      data: { type: "object" },
    },
    required: ["ok", "message", "data"],
    additionalProperties: false,
  });

  app.onError(async (e, c: Context) => {
    const t = await getTranslator(c);
    if (c.var.logger) {
      c.var.logger.error(e);
    } else {
      console.error(e);
    }
    const sqlError = convertSqlErrorToBusinessError(e);
    if (sqlError) {
      throw toHttpException(sqlError);
    }
    if (e instanceof BusinessError) {
      throw toHttpException(e);
    }
    if (e instanceof HTTPException) {
      return c.json<ResJson>(
        {
          ok: false,
          message: await t(e.message),
          data: e.cause as HTTPExceptionOptions["cause"],
        },
        { status: e.status as ContentfulStatusCode }
      );
    }
    const stack = e instanceof Error ? e.stack : String(e);
    const serverErrorMsg = await t("errorHandler.serverError");
    const msg = `${serverErrorMsg}: ${stack}`;
    if (c.var.logger) {
      c.var.logger.error(msg);
    } else {
      console.error(msg);
    }
    return c.json<ResJson<string | null>>(
      {
        ok: false,
        message: await t("errorHandler.unknownError"),
        data: getEnv("NODE_ENV") !== "production" ? e.message : null,
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
    console.log("uncaughtException:" + err);
  });

console.log(`🚀 Server started in ${getEnv("NODE_ENV")} mode`);
