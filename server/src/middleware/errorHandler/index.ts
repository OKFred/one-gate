import type { App, NodeHonoContext } from "@/types/app.ts";
import {
  createTranslator,
  getTranslator,
  LanguageKey,
} from "@/middleware/i18n";
// import { sendFeishuMessage } from "@/rpc/feishu/instance";
import { HTTPException } from "hono/http-exception";

type HTTPExceptionConstructorParams = Required<
  ConstructorParameters<typeof HTTPException>
>;
type HTTPExceptionOptions = Required<HTTPExceptionConstructorParams[1]>; // 提取第二个参数的类型

export default function errorHandler(app: App) {
  app.notFound((c) => {
    const t = getTranslator(c);
    return c.json(
      {
        ok: false,
        message: t("i18n.middleware.errorHandler.notFound"),
        data: null,
      },
      { status: 404 }
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

    if (e instanceof HTTPException) {
      const message = e.message
        ? e.message.startsWith("i18n.")
          ? t(e.message as LanguageKey)
          : e.message
        : e.status === 404
          ? t("i18n.middleware.errorHandler.targetNotExist")
          : e.status === 422
            ? t("i18n.middleware.errorHandler.validationFailed")
            : t("i18n.middleware.errorHandler.undefinedError");
      if (message === t("i18n.middleware.errorHandler.undefinedError")) {
        c.var.logger.error(
          t("i18n.middleware.errorHandler.undefinedError") + ": " + e.stack
        );
      }
      return c.json(
        {
          ok: false,
          message,
          data: e.cause as HTTPExceptionOptions["cause"],
        },
        {
          status: e.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    let message = t("i18n.middleware.errorHandler.unknownError");
    if (e.message?.includes("SQLITE_CONSTRAINT_UNIQUE")) {
      message = t("i18n.middleware.errorHandler.duplicatedData");
      return c.json(
        {
          ok: false,
          message,
        },
        { status: 409 }
      );
    }
    c.var.logger.error(
      t("i18n.middleware.errorHandler.serverError") + ": " + e.stack
    );
    return c.json(
      {
        ok: false,
        message,
        data: process.env.NODE_ENV !== "production" ? e.message : null,
      },
      { status: 500 }
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
  console.log(
    createTranslator(process.env.LOCALE)(
      "i18n.middleware.errorHandler.serverStarted"
    )
  );
