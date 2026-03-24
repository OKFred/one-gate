import type { App, NodeHonoContext } from "@/types/app.ts";
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
  app.notFound((c: NodeHonoContext) => {
    const t = getTranslator(c);
    return c.json(
      {
        ok: false,
        message: t("errorHandler.notFound"),
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

  app.onError((e, c: NodeHonoContext) => {
    const t = getTranslator(c);
    const sqlError = convertSqlErrorToBusinessError(e);
    if (sqlError) {
      throw toHttpException(sqlError);
    }
    if (e instanceof BusinessError) {
      throw toHttpException(e);
    }
    if (e instanceof HTTPException) {
      return c.json(
        {
          ok: false,
          message: t(e.message),
          data: e.cause as HTTPExceptionOptions["cause"],
        },
        { status: e.status as ContentfulStatusCode }
      );
    }
    c.var.logger.error(t("errorHandler.serverError") + ": " + e.stack);
    return c.json(
      {
        ok: false,
        message: t("errorHandler.unknownError"),
        data: process.env.NODE_ENV !== "production" ? e.message : null,
      },
      { status: StatusCodes.INTERNAL_SERVER_ERROR as ContentfulStatusCode }
    );
  });
}

/**
 * @description: 未捕获异常处理事件上报
 */
process.on("uncaughtException", function (err) {
  console.error("uncaughtException:", err);
  console.log("uncaughtException:" + err);
});

process.env.NODE_ENV === "production" &&
  console.log("🚀 Server started in production mode");
