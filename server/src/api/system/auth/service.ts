import userService from "@/api/system/user/service";
import { tokenUtils } from "@/utils/token";
import { HTTPException } from "hono/http-exception";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";

// 普通登录
const loginReq = {
  type: "object",
  properties: {
    username: {
      type: "string",
      description: "用户名",
      examples: ["admin"],
    },
    password: {
      type: "string",
      description: "密码",
      examples: ["password123"],
    },
  },
  required: ["username", "password"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const loginRes = {
  type: "object",
  properties: {
    userObj: {
      type: "object",
      properties: {
        token: {
          type: "string",
          description: "用户token",
        },
        id: {
          type: "number",
          description: "用户ID",
        },
        username: {
          type: "string",
          description: "用户名",
        },
        roleIds: {
          type: "string",
          description: "角色ID列表，逗号分隔",
        },
        departmentId: {
          type: ["number", "null"],
          description: "部门ID",
        },
        isEnabled: {
          type: "boolean",
          description: "是否启用",
        },
      },
      required: ["token", "id", "username", "roleIds", "isEnabled"] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onLogin(
  c: NodeHonoContext
): Promise<FromSchema<typeof loginRes> | null> {
  const verifyResult = await userService.verify.service(c);
  if (!verifyResult || !verifyResult.valid || !verifyResult.userObj)
    throw new HTTPException(
      httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
      {
        message: "i18n.api.system.authFailed" satisfies LanguageKey,
      }
    );
  const userObj = verifyResult.userObj;
  const { id, username, roleIds, departmentId, isEnabled } = userObj;
  // 生成token
  const token = tokenUtils.generateToken({
    userId: id,
    username,
  });

  return {
    userObj: {
      token,
      id,
      username,
      roleIds,
      departmentId: departmentId ?? null,
      isEnabled,
    },
  };
}

const loginApi = {
  req: loginReq,
  res: loginRes,
  pathInfo: {
    path: "/login",
    method: "post",
    summary: "用户登录",
  } as const,
  service: onLogin,
};

// 微信登录
const wechatLoginReq = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "微信授权码",
      examples: ["061abc123"],
    },
    state: {
      type: "string",
      description: "状态参数(可选)",
      examples: ["STATE"],
    },
  },
  required: ["code"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const wechatLoginRes = {
  ...loginRes,
} as const satisfies JSONSchema;

async function onWechatLogin(
  c: NodeHonoContext
): Promise<FromSchema<typeof wechatLoginRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof wechatLoginReq>;
  const { code, state } = obj;

  // TODO: 实现微信登录逻辑
  // 1. 使用code换取access_token
  // 2. 使用access_token获取用户信息
  // 3. 根据微信用户信息查找或创建本地用户
  // 4. 生成token

  // 暂时返回null，需要配置微信开发者信息
  console.log("微信登录暂未实现，需要配置微信AppID和AppSecret");
  console.log("收到的参数:", { code, state });
  throw new HTTPException(
    httpStatusCode.NOT_IMPLEMENTED as ContentfulStatusCode,
    {
      message: "i18n.api.system.wechatNotImplemented" satisfies LanguageKey,
    }
  );
}

const wechatLoginApi = {
  req: wechatLoginReq,
  res: wechatLoginRes,
  pathInfo: {
    path: "/wechat",
    method: "post",
    summary: "微信登录",
  } as const,
  service: onWechatLogin,
};

// 验证token
const verifyTokenReq = {
  type: "object",
  properties: {
    token: {
      type: "string",
      description: "需要验证的token",
      examples: ["example-session-token"],
    },
  },
  required: ["token"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const verifyTokenRes = {
  type: "boolean",
} as const satisfies JSONSchema;

async function onVerifyToken(
  c: NodeHonoContext
): Promise<FromSchema<typeof verifyTokenRes>> {
  const obj = c.get("bodyObj") as FromSchema<typeof verifyTokenReq>;
  const { token } = obj;
  const isValid = tokenUtils.verifyToken(token) !== null;
  return isValid;
}

const verifyTokenApi = {
  req: verifyTokenReq,
  res: verifyTokenRes,
  pathInfo: {
    path: "/verify",
    method: "post",
    summary: "验证token",
  } as const,
  service: onVerifyToken,
};

// 刷新token
const refreshTokenReq = {
  type: "object",
  properties: {
    token: {
      type: "string",
      description: "需要刷新的token",
      examples: ["example-session-token"],
    },
  },
  required: ["token"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const refreshTokenRes = {
  type: "object",
  properties: {
    token: {
      type: "string",
      description: "新的token",
    },
  },
  required: ["token"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onRefreshToken(
  c: NodeHonoContext
): Promise<FromSchema<typeof refreshTokenRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof refreshTokenReq>;
  const { token } = obj;
  const newToken = tokenUtils.refreshToken(token);
  if (!newToken) {
    return null;
  }

  return {
    token: newToken,
  };
}

const refreshTokenApi = {
  req: refreshTokenReq,
  res: refreshTokenRes,
  pathInfo: {
    path: "/refresh",
    method: "post",
    summary: "刷新token",
  } as const,
  service: onRefreshToken,
};

export default {
  login: loginApi,
  wechat: wechatLoginApi,
  verify: verifyTokenApi,
  refresh: refreshTokenApi,
};
