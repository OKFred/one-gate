import type { App, NodeHonoContext } from "@/types/app.ts";
// import { sendFeishuMessage } from "@/rpc/feishu/instance";
import { HTTPException } from "hono/http-exception";

type HTTPExceptionConstructorParams = Required<
  ConstructorParameters<typeof HTTPException>
>;
type HTTPExceptionOptions = Required<HTTPExceptionConstructorParams[1]>; // 提取第二个参数的类型

export default function errorHandler(app: App) {
  app.notFound((c) => {
    return c.json(
      { ok: false, message: "接口不存在", data: null },
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
    if (e instanceof HTTPException) {
      const message = e.message
        ? e.message
        : e.status === 404
          ? "目标不存在"
          : e.status === 422
            ? "请求体校验失败"
            : "服务器异常";
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
    let message = "未知异常";
    if (e.message?.includes("SQLITE_CONSTRAINT_UNIQUE")) {
      message = "数据重复";
      return c.json(
        {
          ok: false,
          message,
        },
        { status: 409 }
      );
    }
    c.var.logger.error(`接口异常：` + e.stack);
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

process.env.NODE_ENV === "production" && console.log("服务器已启动");
