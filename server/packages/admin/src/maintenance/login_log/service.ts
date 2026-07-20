import {
  LoginAuditVO,
  LoginAuditListKeys,
  LoginAuditSortableKeys,
  type LoginAuditPOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { RequiredKeys } from "@hodor/core/types/app";
import { registry } from "../../common/registry";

/**
 * 记录用户登录审计
 * @param userId 用户ID
 * @param ip 客户端IP
 * @param userAgent 客户端User-Agent
 * @param realName 真实姓名
 */
async function recordLogin(
  userId: number,
  ip: string,
  userAgent: string,
  realName?: string | null
) {
  const creatorName = realName || String(userId);

  await registry.base.log.sys.add({
    namespace: "login",
    logLevel: "INFO",
    payloadType: "json",
    logValue: {
      userId,
      loginTimeUtc: Date.now(),
      ip,
      userAgent,
    },
    creatorId: userId,
    creatorName: creatorName,
  });
}

// --- API ---

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    userId: LoginAuditVO.userId,
    orderBy: orderByWrapper<(keyof LoginAuditPOLike)[]>(LoginAuditSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<LoginAuditPOLike>[]>(
    {
      ...LoginAuditVO,
    },
    [...LoginAuditListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    userId,
  } = params;
  const finalPageSize = Math.min(pageSize, 1000);

  const filters = userId ? { userId } : undefined;

  const { total, list } = await registry.base.log.sys.list({
    namespace: "login",
    pageNo,
    pageSize: finalPageSize,
    orderBy:
      orderBy === "id" || orderBy === "createTimeUtc" ? orderBy : undefined,
    descend,
    filters,
  });

  // Map back to LoginAuditPOLike
  const mappedList = list.map((item) => {
    const val = item.logValue as any;
    return {
      id: item.id,
      userId: val.userId,
      loginTimeUtc: val.loginTimeUtc,
      ip: val.ip,
      userAgent: val.userAgent,
      remark: item.remark,
      creatorId: item.creatorId,
      creatorName: item.creatorName,
      createTimeUtc: item.createTimeUtc,
    } as LoginAuditPOLike;
  });

  // For mapped sort where the sort wasn't handled natively by DB because it's a JSON field
  if (orderBy === "userId" || orderBy === "loginTimeUtc") {
    mappedList.sort((a, b) => {
      const aVal = a[orderBy] as number;
      const bVal = b[orderBy] as number;
      return descend ? bVal - aVal : aVal - bVal;
    });
  }

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: mappedList as any,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取登录审计列表",
  } as const,
  adapter: bodyUserAdapter, // 需要登录才能查看审计记录
  service: onList,
  permission: { action: "read" },
} satisfies API;

export const utils = {
  recordLogin,
};

export default {
  list: listApi,
};
