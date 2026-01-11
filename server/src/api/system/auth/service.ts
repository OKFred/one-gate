import userService, { utils as userUtils } from "@/api/system/user/service";
import { tokenUtils } from "@/utils/token";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@/types/app";
import { UserDetailKeys, UserVO } from "../user/db.table";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";

// 普通登录
const loginReq = {
  type: "object",
  properties: {
    username: {
      type: "string",
      description: "用户名",
      examples: ["admin"],
      maxLength: 100,
    },
    password: {
      type: "string",
      description: "密码",
      examples: ["pass"],
      maxLength: 100,
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
          maxLength: 500,
        },
        ...UserVO,
      },
      required: ["token", ...UserDetailKeys] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onLogin(
  params: FromSchema<typeof loginReq>
): Promise<FromSchema<typeof loginRes> | null> {
  const { username, password: base64Password } = params;
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const password = plainPassword;
  const verifyResult = await userUtils.verifyUsernameAndPassword({
    username,
    password,
  });
  if (
    !verifyResult ||
    !verifyResult.valid ||
    !verifyResult.userObj ||
    !verifyResult.userObj.isEnabled
  )
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
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
  adapter: bodyAdapter,
  service: onLogin,
} satisfies API;

// 微信登录
const wechatLoginReq = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "微信授权码",
      examples: ["061abc123"],
      maxLength: 50,
    },
    state: {
      type: "string",
      description: "状态参数(可选)",
      examples: ["STATE"],
      maxLength: 100,
    },
  },
  required: ["code"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const wechatLoginRes = {
  ...loginRes,
} as const satisfies JSONSchema;

async function onWechatLogin(
  params: FromSchema<typeof wechatLoginReq>
): Promise<FromSchema<typeof wechatLoginRes> | null> {
  const { code, state } = params;

  // TODO: 实现微信登录逻辑
  // 1. 使用code换取access_token
  // 2. 使用access_token获取用户信息
  // 3. 根据微信用户信息查找或创建本地用户
  // 4. 生成token

  // 暂时返回null，需要配置微信开发者信息
  console.log("微信登录暂未实现，需要配置微信AppID和AppSecret");
  console.log("收到的参数:", { code, state });
  throw new BusinessError(BusinessErrorCode.NOT_YET_IMPLEMENTED);
}

const wechatLoginApi = {
  req: wechatLoginReq,
  res: wechatLoginRes,
  pathInfo: {
    path: "/wechat",
    method: "post",
    summary: "微信登录",
  } as const,
  adapter: bodyAdapter,
  service: onWechatLogin,
} satisfies API;

// 刷新token
const refreshTokenReq = {
  type: "object",
  properties: {
    token: {
      type: "string",
      description: "需要刷新的token",
      examples: ["example-session-token"],
      maxLength: 500,
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
      maxLength: 500,
    },
  },
  required: ["token"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onRefreshToken(
  params: FromSchema<typeof refreshTokenReq>
): Promise<FromSchema<typeof refreshTokenRes> | null> {
  const { token } = params;
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
  adapter: bodyAdapter,
  service: onRefreshToken,
} satisfies API;

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
        ...UserVO,
      },
      required: [...UserDetailKeys] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onProfile(
  _params: FromSchema<typeof profileReq>,
  userObj: UserObj
): Promise<FromSchema<typeof profileRes> | null> {
  const { userId } = userObj;
  const userDataObj = await userService.get.service({ id: userId });
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
  adapter: bodyUserAdapter,
  service: onProfile,
} satisfies API;

export default {
  login: loginApi,
  wechat: wechatLoginApi,
  refresh: refreshTokenApi,
  profile: profileApi,
};
