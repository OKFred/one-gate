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
import { GithubOrg, GithubUser, GithubTokenResponse } from "./type";

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
    const pastIps = recentLogs
      .map((l) => (l.logValue as unknown as { ip?: string })?.ip)
      .filter(Boolean);
    const isNewIp = pastIps.length > 0 && !pastIps.includes(clientInfo.ip);

    // 联查用户个人邮件接收偏好
    const userPrefList = await registry.mail.recipient.list({
      scope: "user",
      userId: id,
      pageNo: 1,
      pageSize: 1,
    });
    const userPref = userPrefList?.list?.[0];
    const isRemoteLoginWarnEnabled = userPref ? userPref.remoteLoginWarn : true;
    const targetEmail =
      userPref?.email || (userObj as unknown as { email?: string }).email;

    if (isNewIp && isRemoteLoginWarnEnabled && targetEmail) {
      // 触发异地登录安全警告邮件（异步发送，无阻塞）
      registry.mail
        .send({
          templateName: "SYS_REMOTE_LOGIN_WARN",
          scope: "sys",
          receiverArr: [{ name: username, address: targetEmail as string }],
          templateParams: {
            username,
            ip: clientInfo.ip,
            time: new Date().toLocaleString(),
            userAgent: clientInfo.userAgent,
          },
        })
        .catch((err: unknown) => {
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

// GitHub SSO
const githubUrlReq = {
  type: "object",
  properties: {
    state: {
      type: "string",
      description: "OAuth state",
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const githubUrlRes = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description: "GitHub OAuth URL",
    },
  },
  required: ["url"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGithubUrl(
  params: FromSchema<typeof githubUrlReq>
): Promise<FromSchema<typeof githubUrlRes>> {
  const clientId = process.env.GH_CLIENT_ID;
  if (!clientId) {
    throw new BusinessError(BusinessErrorCode.UNKNOWN_ERROR, {
      message: "Missing GH_CLIENT_ID",
    });
  }
  const stateQuery = params.state
    ? `&state=${encodeURIComponent(params.state)}`
    : "";
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email%20read:org${stateQuery}`;
  return { url };
}

const githubUrlApi = {
  req: githubUrlReq,
  res: githubUrlRes,
  pathInfo: {
    path: "/github/url",
    method: "post",
    summary: "获取GitHub登录授权链接",
  } as const,
  adapter: bodyAdapter,
  service: onGithubUrl,
  permission: false,
} satisfies API;

const githubLoginReq = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "GitHub OAuth Code",
    },
  },
  required: ["code"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const githubLoginRes = {
  ...loginRes,
} as const satisfies JSONSchema;

async function onGithubLogin(
  params: FromSchema<typeof githubLoginReq>,
  clientInfo: { ip: string; userAgent: string }
): Promise<FromSchema<typeof githubLoginRes>> {
  const { code } = params;
  const clientId = process.env.GH_CLIENT_ID;
  const clientSecret = process.env.GH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new BusinessError(BusinessErrorCode.UNKNOWN_ERROR, {
      message: "Missing GH_CLIENT_ID or GH_CLIENT_SECRET",
    });
  }

  // 1. 获取 Access Token
  const tokenData = await registry.base.httpFetch.json<GithubTokenResponse>(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
      namespace: "system.auth.github",
      remark: "GitHub OAuth AccessToken",
    }
  );

  if (tokenData.error) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `GitHub Auth Error: ${tokenData.error_description}`,
    });
  }
  const accessToken = tokenData.access_token;

  // 2. 获取 GitHub 用户信息
  const githubUser = await registry.base.httpFetch.json<GithubUser>(
    "https://api.github.com/user",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      namespace: "system.auth.github",
      remark: "GitHub Get User Profile",
    }
  );
  if (!githubUser.id) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: "获取 GitHub 用户信息失败",
    });
  }

  const githubIdStr = String(githubUser.id);
  const githubLogin = githubUser.login;

  let finalUserId: number;
  let finalUsername: string;
  let finalLangCode: string = "zh-CN";

  // 3. 查找是否已绑定本地用户
  const existingOauth = await userUtils.findOauthByProviderId(
    "github",
    githubIdStr
  );

  if (existingOauth) {
    // 已经绑定，允许直接登录
    finalUserId = existingOauth.userId;
    const localUser = await userUtils.getUser(finalUserId);
    if (!localUser) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED, {
        message: "关联的本地用户不存在",
      });
    }
    finalUsername = localUser.username;
    finalLangCode = localUser.langCode;
  } else {
    // 未绑定过，必须在指定组织内才可以自动注册
    const orgs = await registry.base.httpFetch.json<GithubOrg[]>(
      "https://api.github.com/user/orgs",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        namespace: "system.auth.github",
        remark: "GitHub Get User Orgs",
      }
    );
    const targetOrgName = process.env.GH_ORG_NAME;
    const isMember = orgs.some((org) => org.login === targetOrgName);

    if (!isMember) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED, {
        message: `对不起，仅限 ${targetOrgName} 组织下的成员登录！(或请先绑定账号)`,
      });
    }

    try {
      const tempPassword = await userUtils.convertPassword(
        Buffer.from(Math.random().toString()).toString("base64")
      );
      finalUserId = await userUtils.onInsert({
        username: githubLogin,
        password: tempPassword,
        langCode: "zh-CN",
        remark: "GitHub OAuth Auto Create",
        departmentId: null,
        regionId: null,
        roleIdArr: [],
        isEnabled: true,
        creatorId: 1,
      });

      finalUsername = githubLogin;

      await userUtils.onInsertOauth({
        userId: finalUserId,
        provider: "github",
        providerId: githubIdStr,
        providerUsername: githubLogin,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        throw new BusinessError(BusinessErrorCode.DUPLICATE_DATA, {
          message: `用户名 ${githubLogin} 冲突，拒绝登录`,
        });
      }
      throw e;
    }
  }

  // 生成token
  const token = tokenUtils.generateToken({
    userId: finalUserId,
    username: finalUsername,
  });

  return {
    userObj: {
      id: finalUserId,
      username: finalUsername,
      langCode: finalLangCode,
      token,
    },
  };
}

const githubLoginApi = {
  req: githubLoginReq,
  res: githubLoginRes,
  pathInfo: {
    path: "/github/login",
    method: "post",
    summary: "GitHub 登录回调",
    description:
      "使用 GitHub 的授权 code 进行登录，如果之前未绑定过但属于指定组织，则自动创建账号",
    tags: ["auth", "Admin Auth"],
  },
  adapter: bodyAdapter,
  service: onGithubLogin,
  permission: false,
} satisfies API;

// 绑定 GitHub
const githubBindReq = githubLoginReq;
const githubBindRes = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGithubBind(
  params: FromSchema<typeof githubBindReq>,
  userObj: UserObj
): Promise<FromSchema<typeof githubBindRes>> {
  const { code } = params;
  const clientId = process.env.GH_CLIENT_ID;
  const clientSecret = process.env.GH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new BusinessError(BusinessErrorCode.UNKNOWN_ERROR, {
      message: "Missing GH_CLIENT_ID or GH_CLIENT_SECRET",
    });
  }

  const currentUserId = userObj.userId;

  // 1. 获取 Access Token
  const tokenData = await registry.base.httpFetch.json<GithubTokenResponse>(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
      namespace: "system.auth.github",
      creatorId: currentUserId,
      remark: "GitHub Bind AccessToken",
    }
  );

  if (tokenData.error) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `GitHub Auth Error: ${tokenData.error_description}`,
    });
  }
  const accessToken = tokenData.access_token;

  // 2. 获取 GitHub 用户信息
  const githubUser = await registry.base.httpFetch.json<GithubUser>(
    "https://api.github.com/user",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      namespace: "system.auth.github",
      creatorId: currentUserId,
      remark: "GitHub Bind User Profile",
    }
  );
  if (!githubUser.id) {
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: "获取 GitHub 用户信息失败",
    });
  }

  const githubIdStr = String(githubUser.id);
  const githubLogin = githubUser.login;

  // 3. 检查是否已经被绑定
  const existingOauth = await userUtils.findOauthByProviderId(
    "github",
    githubIdStr
  );

  if (existingOauth) {
    if (existingOauth.userId === currentUserId) {
      return { message: "你已经绑定过此 GitHub 账号了" };
    }
    throw new BusinessError(BusinessErrorCode.DUPLICATE_DATA, {
      message: "此 GitHub 账号已被系统内的其他用户绑定",
    });
  }

  // 4. 执行绑定
  await userUtils.onInsertOauth({
    userId: currentUserId,
    provider: "github",
    providerId: githubIdStr,
    providerUsername: githubLogin,
  });

  return { message: "绑定成功" };
}

const githubBindApi = {
  req: githubBindReq,
  res: githubBindRes,
  pathInfo: {
    path: "/github/bind",
    method: "post",
    summary: "当前登录用户绑定 GitHub",
    description: "当前登录用户通过 GitHub code 绑定其账号",
    tags: ["auth", "Admin Auth"],
  },
  adapter: bodyUserAdapter,
  service: onGithubBind,
  permission: false,
} satisfies API;

// 解绑 GitHub
const githubUnbindReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

const githubUnbindRes = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGithubUnbind(
  _params: FromSchema<typeof githubUnbindReq>,
  userObj: UserObj
): Promise<FromSchema<typeof githubUnbindRes>> {
  const { userId } = userObj;
  await userUtils.deleteOauthByUserAndProvider(userId, "github");
  return { message: "解绑成功" };
}

const githubUnbindApi = {
  req: githubUnbindReq,
  res: githubUnbindRes,
  pathInfo: {
    path: "/github/unbind",
    method: "post",
    summary: "当前登录用户解绑 GitHub",
    description: "删除当前登录用户绑定的 GitHub OAuth 记录",
    tags: ["auth", "Admin Auth"],
  },
  adapter: bodyUserAdapter,
  service: onGithubUnbind,
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
        githubUsername: {
          type: ["string", "null"],
          description: "绑定的 GitHub 用户名",
        },
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

  const githubOauth = await userUtils.findOauthByUserAndProvider(
    userId,
    "github"
  );
  const githubUsername = githubOauth?.providerUsername || null;

  return {
    userObj: {
      ...userDataObj,
      githubUsername,
    },
  };
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
  githubUrl: githubUrlApi,
  githubLogin: githubLoginApi,
  githubBind: githubBindApi,
  githubUnbind: githubUnbindApi,
};
