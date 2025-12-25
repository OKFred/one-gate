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
      examples: ["pass"],
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
        langCode: {
          type: "string",
          description: "用户语言代码",
        },
        isEnabled: {
          type: "boolean",
          description: "是否启用",
        },
        departmentObj: {
          type: "object",
          description: "部门对象",
          properties: {
            value: { type: "number", description: "部门ID", examples: [1] },
            label: {
              type: "string",
              description: "部门名称",
              examples: ["研发部"],
            },
          },
          required: ["value", "label"],
          additionalProperties: false,
        },
        roleArr: {
          type: "array",
          description: "角色数组",
          items: {
            type: "object",
            properties: {
              value: { type: "number", description: "角色ID", examples: [1] },
              label: {
                type: "string",
                description: "角色名称",
                examples: ["管理员"],
              },
            },
            required: ["value", "label"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "token",
        "id",
        "username",
        "langCode",
        "roleArr",
        "isEnabled",
      ] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onLogin(
  c: NodeHonoContext
): Promise<FromSchema<typeof loginRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof loginReq>;
  const { username, password } = obj;
  const verifyResult = await userService.verifyUsernameAndPassword({
    username,
    password,
  });
  if (!verifyResult || !verifyResult.valid || !verifyResult.userObj)
    throw new HTTPException(
      httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
      {
        message: "i18n.api.system.authFailed" satisfies LanguageKey,
      }
    );
  const userObj = verifyResult.userObj;
  const { id, ...rest } = userObj;
  // 生成token
  const token = tokenUtils.generateToken({
    userId: id,
    username,
  });

  return {
    userObj: {
      token,
      id,
      ...rest,
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

// 获取当前用户信息
const profileReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

const profileRes = {
  type: "object",
  properties: {
    userObj: {
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
        langCode: {
          type: "string",
          description: "用户语言代码",
        },
        isEnabled: {
          type: "boolean",
          description: "是否启用",
        },
        departmentObj: {
          type: "object",
          description: "部门对象",
          properties: {
            value: { type: "number", description: "部门ID", examples: [1] },
            label: {
              type: "string",
              description: "部门名称",
              examples: ["研发部"],
            },
          },
          required: ["value", "label"],
          additionalProperties: false,
        },
        roleArr: {
          type: "array",
          description: "角色数组",
          items: {
            type: "object",
            properties: {
              value: { type: "number", description: "角色ID", examples: [1] },
              label: {
                type: "string",
                description: "角色名称",
                examples: ["管理员"],
              },
            },
            required: ["value", "label"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "id",
        "username",
        "langCode",
        "roleArr",
        "isEnabled",
      ] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onProfile(
  c: NodeHonoContext
): Promise<FromSchema<typeof profileRes> | null> {
  const userObj = c.get("userObj");
  const { userId } = userObj;
  // 设置 bodyObj for userService.get
  c.set("bodyObj", { id: userId });
  const userDataObj = await userService.get.service(c);
  return { userObj: userDataObj };
}

const profileApi = {
  req: profileReq,
  res: profileRes,
  pathInfo: {
    path: "/profile",
    method: "post",
    summary: "获取当前用户信息",
  } as const,
  service: onProfile,
};

export default {
  login: loginApi,
  wechat: wechatLoginApi,
  verify: verifyTokenApi,
  refresh: refreshTokenApi,
  profile: profileApi,
};
