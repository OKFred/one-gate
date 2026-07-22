import userService, { utils as userUtils } from "../user/service";
import permissionService from "../permission/service";
import { registry } from "../../common/registry.js";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { tokenUtils } from "@hodor/core/utils/token";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import {
  IndexVO,
  UserAddVO,
  UserDetailKeys,
  UserLoginResultKeys,
  UserTokenVO,
  UserVO,
} from "../user/model";
import {
  bodyAdapter,
  bodyUserAdapter,
  bodyClientInfoAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import { preventLoginFailure, preventWrongPassword } from "./prevention";

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
        id: UserVO.id,
        username: UserVO.username,
        langCode: UserVO.langCode,
        token: UserTokenVO.token,
      },
      required: [...UserLoginResultKeys] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onLogin(
  params: FromSchema<typeof loginReq>,
  clientInfo: { ip: string; userAgent: string }
): Promise<FromSchema<typeof loginRes> | null> {
  const { username, password: base64Password } = params;
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const password = plainPassword;
  const verifyResult = await userUtils.verifyUsernameAndPassword({
    username,
    password,
  });

  // 前置校验
  preventLoginFailure(verifyResult);

  const userObj = verifyResult.userObj!;
  const { id, langCode, ...rest } = userObj;
  // 生成token
  const token = tokenUtils.generateToken({
    userId: id,
    username,
  });

  // 检查是否存在异地登录（判断近 30 条历史登录记录中是否有当前 IP）
  try {
    const recentLogsRes = await registry.base.log.sys.list({
      namespace: "login",
      creatorId: id,
      pageSize: 30,
      pageNo: 1,
    });
    const recentLogs = recentLogsRes?.list || [];
    const pastIps = recentLogs.map((l: any) => l.logValue?.ip).filter(Boolean);
    const isNewIp = pastIps.length > 0 && !pastIps.includes(clientInfo.ip);

    if (isNewIp && (userObj as any).email) {
      // 触发异地登录安全警告邮件（异步发送，无阻塞）
      registry.mail
        .send({
          templateName: "SYS_REMOTE_LOGIN_WARN",
          scope: "sys",
          receiverArr: [{ name: username, address: (userObj as any).email }],
          templateParams: {
            username,
            ip: clientInfo.ip,
            time: new Date().toLocaleString(),
            userAgent: clientInfo.userAgent,
          },
        })
        .catch((err: any) => {
          console.error("[Remote Login Mail Alert Error]", err);
        });
    }
  } catch (err) {
    console.error("[Remote IP Detection Failed]", err);
  }

  // 记录登录审计
  await registry.maintenance.recordLogin(
    id,
    clientInfo.ip,
    clientInfo.userAgent,
    username
  );

  return {
    userObj: {
      id,
      username,
      langCode,
      token,
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
  adapter: bodyClientInfoAdapter,
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
  permission: false,
} satisfies API;

// 刷新token
const refreshTokenReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;
const refreshTokenRes = {
  type: "object",
  properties: {
    token: {
      ...UserTokenVO.token,
      description: "新的token",
    },
  },
  required: ["token"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onRefreshToken(
  params: FromSchema<typeof refreshTokenReq>,
  userObj: UserObj
): Promise<FromSchema<typeof refreshTokenRes> | null> {
  const { token } = userObj;
  const newToken = tokenUtils.refreshToken(token);
  return { token: newToken! };
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
  permission: false,
} satisfies API;

// 检查token有效性
const checkTokenReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;
const checkTokenRes = {
  type: "boolean",
} as const satisfies JSONSchema;
async function onCheckToken(
  params: FromSchema<typeof checkTokenReq>,
  userObj: UserObj
): Promise<FromSchema<typeof checkTokenRes> | null> {
  return !!userObj;
}
const checkTokenApi = {
  req: checkTokenReq,
  res: checkTokenRes,
  pathInfo: {
    path: "/check",
    method: "post",
    summary: "检查token有效性",
  } as const,
  adapter: bodyUserAdapter,
  service: onCheckToken,
  permission: false,
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
): Promise<FromSchema<typeof profileRes>> {
  const { userId } = userObj;
  const userDataObj = await userService.get.service({ id: userId });
  preventEmpty(userDataObj);
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
  permission: false,
} satisfies API;

const updateProfileReq = {
  type: "object",
  properties: {
    /* 当前仅支持更新用户国家/地区，以及备注 */
    regionObj: UserVO.regionObj,
    remark: UserVO.remark,
  },
  required: [] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateProfileRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdateProfile(
  params: FromSchema<typeof updateProfileReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateProfileRes> | null> {
  const { userId: id } = userObj;
  const { regionObj, remark } = params;
  const regionId = regionObj ? regionObj.value : null;
  if (regionId) await registry.i18n.verifyRegion(regionId);
  const res = await userUtils.updateUserInfo(
    { id, regionObj, remark: remark ?? undefined },
    userObj
  );
  return res;
}
const updateProfileApi = {
  req: updateProfileReq,
  res: updateProfileRes,
  pathInfo: {
    path: "/updateProfile",
    method: "post",
    summary: "更新当前用户信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdateProfile,
  permission: false,
} satisfies API;

/* 为什么“更新用户信息”和“更新用户语言”不适合强行复用？
1️⃣ 权限语义完全不同（这是最关键的）
2️⃣ 审计 & 合规视角：语言 ≠ 用户资料
3️⃣ 频率 & 调用来源完全不一样 */
const updateLangCodeReq = {
  type: "object",
  properties: {
    langCode: UserVO.langCode,
  },
  required: ["langCode"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateLangCodeRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdateLangCode(
  params: FromSchema<typeof updateLangCodeReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateLangCodeRes> | null> {
  const { userId: id } = userObj;
  const { langCode } = params;
  const updateData = { id, langCode };
  return await userUtils.updateLangCode(updateData, userObj);
}
const updateLangCodeApi = {
  req: updateLangCodeReq,
  res: updateLangCodeRes,
  pathInfo: {
    path: "/updateLangCode",
    method: "post",
    summary: "更新用户语言",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdateLangCode,
  permission: false,
} satisfies API;

// 更新用户密码
const updatePasswordReq = {
  type: "object",
  properties: {
    oldPassword: { ...UserAddVO.password, description: "旧密码" },
    newPassword: { ...UserAddVO.password, description: "新密码" },
  },
  required: ["oldPassword", "newPassword"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const updatePasswordRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdatePassword(
  params: FromSchema<typeof updatePasswordReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updatePasswordRes> | null> {
  const { userId: id, username } = userObj;
  const { oldPassword: oldBase64Password, newPassword: newBase64Password } =
    params;
  const oldPlainPassword = Buffer.from(oldBase64Password, "base64").toString(
    "utf-8"
  );
  const verifyResult = await userUtils.verifyUsernameAndPassword({
    username,
    password: oldPlainPassword,
  });

  // 前置校验
  preventWrongPassword(verifyResult.valid);
  const newHashedPassword = await userUtils.convertPassword(newBase64Password);
  const res = await userUtils.updatePassword(
    { id, newHashedPassword },
    userObj
  );
  return res;
}
const updatePasswordApi = {
  req: updatePasswordReq,
  res: updatePasswordRes,
  pathInfo: {
    path: "/updatePassword",
    method: "post",
    summary: "更新用户密码",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdatePassword,
  permission: false,
} satisfies API;

// 获取按钮权限
const getButtonPermissionReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;
const getButtonPermissionRes = {
  type: "object",
  properties: {
    permissions: {
      type: "array",
      items: {
        ...permissionService.get.res,
      },
    },
  },
  required: ["permissions"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGetButtonPermission(
  params: FromSchema<typeof getButtonPermissionReq>,
  userObj: UserObj
): Promise<FromSchema<typeof getButtonPermissionRes> | null> {
  // 必须手动触发加载，因为该接口本身不走 RBAC 校验
  await userObj.ensureLoaded();

  const buttonPermissions = userObj.permissions;
  return { permissions: buttonPermissions };
}
const getButtonPermissionApi = {
  req: getButtonPermissionReq,
  res: getButtonPermissionRes,
  pathInfo: {
    path: "/getButtonPermission",
    method: "post",
    summary: "获取按钮权限",
  } as const,
  permission: false,
  adapter: bodyUserAdapter,
  service: onGetButtonPermission,
} satisfies API;

export default {
  login: loginApi,
  wechat: wechatLoginApi,
  refresh: refreshTokenApi,
  check: checkTokenApi,
  profile: profileApi,
  updateProfile: updateProfileApi,
  updateLangCode: updateLangCodeApi,
  updatePassword: updatePasswordApi,
  getButtonPermission: getButtonPermissionApi,
};
