import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { API } from "@hodor/core/middleware/encapsulation";
import { initDatabase } from "@hodor/core/db/init";
import { getEnv } from "@hodor/core/utils/env";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { rawAdapter } from "@hodor/core/middleware/encapsulation/adapter";

/**
 * 初始化数据库接口
 */
const initReq = {
  type: "object",
  properties: {
    reset: {
      type: "boolean",
      description: "是否重置数据（清空表后重新插入）",
      default: false,
    },
    skipSuper: {
      type: "boolean",
      description: "是否跳过初始化管理员账号",
    },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const initRes = {
  type: "object",
  properties: {
    results: {
      type: "object",
      description: "各模块初始化结果统计",
      additionalProperties: true,
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onInit(c): Promise<FromSchema<typeof initRes>> {
  const initToken = c.req.header()["x_init_token"];
  const { reset = false, skipSuper = false } = c.get("bodyObj");
  const user = c.get("userObj");
  // 1. 检查引导令牌 (冷启动场景)
  const expectedToken = getEnv("X_INIT_TOKEN");
  const isValidToken =
    initToken && expectedToken && initToken === expectedToken;

  // 2. 检查超级管理员权限 (已初始化场景)
  const isSuperAdmin = user?.isSuperAdmin === true;

  if (!isValidToken && !isSuperAdmin) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }

  const results = await initDatabase({ reset, skipSuper });
  return { results };
}

const init = {
  req: initReq,
  res: initRes,
  pathInfo: {
    path: "/db",
    method: "post",
    summary: "初始化/同步数据库基础数据",
    description:
      "同步系统所需的权限、菜单、多语言、地区等基础数据。支持增量同步或完全重置。安全验证：请求头 X_INIT_TOKEN 或超级管理员账号登录。",
  } as const,
  // 使用自定义适配器，注入 Header 令牌和 Token 解析出的用户信息
  adapter: rawAdapter,
  service: onInit,
} satisfies API;

export default {
  init,
};
