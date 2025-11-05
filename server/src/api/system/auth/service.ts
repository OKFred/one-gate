import userService from "@/api/system/user/service";
import { tokenUtils } from "@/utils/token";
import { HTTPException } from "hono/http-exception";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { LanguageKey } from "@/types/locales";

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
    token: {
      type: "string",
      description: "用户token",
    },
    user: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "用户ID",
        },
        username: {
          type: "string",
          description: "用户名",
        },
        role: {
          type: "string",
          description: "角色",
        },
        department: {
          type: "string",
          description: "部门",
        },
        isEnabled: {
          type: "boolean",
          description: "是否启用",
        },
      },
      required: ["id", "username", "role", "department", "isEnabled"] as const,
      additionalProperties: false,
    },
  },
  required: ["token", "user"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onLogin(
  obj: FromSchema<typeof loginReq>
): Promise<FromSchema<typeof loginRes> | null> {
  const { username, password } = obj;

  // 验证用户名和密码
  const verifyResult = await userService.verify.service({ username, password });
  if (!verifyResult || !verifyResult.valid || !verifyResult.userId)
    throw new HTTPException(
      httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
      {
        message: "i18n.api.system.authFailed" satisfies LanguageKey,
      }
    );

  // 获取用户信息
  const user = await userService.get.service({ id: verifyResult.userId });
  if (!user || !user.isEnabled)
    throw new HTTPException(
      httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
      {
        message: "i18n.api.system.notAuthenticated" satisfies LanguageKey,
      }
    );
  // 生成token
  const token = tokenUtils.generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    department: user.department,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      department: user.department,
      isEnabled: user.isEnabled,
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
  obj: FromSchema<typeof wechatLoginReq>
): Promise<FromSchema<typeof wechatLoginRes> | null> {
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
  type: "object",
  properties: {
    valid: {
      type: "boolean",
      description: "token是否有效",
    },
    payload: {
      type: "object",
      properties: {
        userId: { type: "number" },
        username: { type: "string" },
        role: { type: "string" },
        department: { type: "string" },
        exp: { type: "number" },
      },
      nullable: true,
      additionalProperties: false,
    },
  },
  required: ["valid"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onVerifyToken(
  obj: FromSchema<typeof verifyTokenReq>
): Promise<FromSchema<typeof verifyTokenRes>> {
  const { token } = obj;
  const payload = tokenUtils.verifyToken(token);
  const isValid = payload !== null;

  return {
    valid: isValid,
    payload: payload,
  };
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
  obj: FromSchema<typeof refreshTokenReq>
): Promise<FromSchema<typeof refreshTokenRes> | null> {
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
