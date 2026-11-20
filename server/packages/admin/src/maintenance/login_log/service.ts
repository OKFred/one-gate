import type { LoginAuditPOLike } from "./model";
import type { FromSchema } from "json-schema-to-ts";
import { adminMaintenanceLoginLogBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
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

const S = adminMaintenanceLoginLogBackendSchemas;

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
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
  const mappedList: LoginAuditPOLike[] = list.map((item) => {
    const val = (item.logValue || {}) as Record<string, unknown>;
    return {
      id: item.id,
      userId: Number(val.userId || 0),
      loginTimeUtc: Number(val.loginTimeUtc || item.createTimeUtc),
      ip: String(val.ip || ""),
      userAgent: String(val.userAgent || ""),
      remark: item.remark ?? null,
      creatorId: item.creatorId,
      creatorName: item.creatorName ?? null,
      createTimeUtc: item.createTimeUtc,
    };
  });

  // For mapped sort where the sort wasn't handled natively by DB because it's a JSON field
  if (orderBy === "userId" || orderBy === "loginTimeUtc") {
    mappedList.sort((a, b) => {
      const aVal = a[orderBy] || 0;
      const bVal = b[orderBy] || 0;
      return descend ? bVal - aVal : aVal - bVal;
    });
  }

  return buildPagedListResult(mappedList, total, pageNo, finalPageSize);
}

export const utils = {
  recordLogin,
};

export default createCrudApis(S, {
  list: {
    adapter: bodyUserAdapter, // 需要登录才能查看审计记录
    summary: "获取登录审计列表",
    handler: onList,
  },
});
