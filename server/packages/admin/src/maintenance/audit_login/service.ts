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
import * as auditLoginRepository from "./repository";

/**
 * 记录用户登录审计
 * @param userId 用户ID
 * @param ip 客户端IP
 * @param userAgent 客户端User-Agent
 */
async function recordLogin(userId: number, ip: string, userAgent: string) {
  await auditLoginRepository.recordLogin(userId, ip, userAgent);
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

  const { total, list } = await auditLoginRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    userId,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: list as any,
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
