import * as baseLogRepository from "./repository";
import type { SysLogPOLike, AuditLogPOLike, BizLogPOLike } from "./model";
import type { InferInsertModel } from "drizzle-orm";
import { baseSysLogTable, baseAuditLogTable, baseBizLogTable } from "./model";

/**
 * Base Log Services
 * 供系统内部各模块通过 registry.base.log 进行调用
 */

const sys = {
  add: async (data: InferInsertModel<typeof baseSysLogTable>) => {
    return await baseLogRepository.insertSysLog(data);
  },
  list: async (params: {
    namespace?: string;
    creatorId?: number;
    pageNo: number;
    pageSize: number;
    orderBy?: keyof SysLogPOLike;
    descend?: boolean;
    filters?: Record<string, unknown>;
  }) => {
    return await baseLogRepository.findSysLogPage(params);
  },
  detail: async (id: number) => {
    return await baseLogRepository.findSysLogById(id);
  },
};

const audit = {
  add: async (data: InferInsertModel<typeof baseAuditLogTable>) => {
    return await baseLogRepository.insertAuditLog(data);
  },
  list: async (params: {
    namespace?: string;
    pageNo: number;
    pageSize: number;
    orderBy?: keyof AuditLogPOLike;
    descend?: boolean;
  }) => {
    return await baseLogRepository.findAuditLogPage(params);
  },
  detail: async (id: number) => {
    return await baseLogRepository.findAuditLogById(id);
  },
};

const biz = {
  add: async (data: InferInsertModel<typeof baseBizLogTable>) => {
    return await baseLogRepository.insertBizLog(data);
  },
  list: async (params: {
    namespace?: string;
    pageNo: number;
    pageSize: number;
    orderBy?: keyof BizLogPOLike;
    descend?: boolean;
    filters?: Record<string, unknown>;
    startTime?: number;
    endTime?: number;
  }) => {
    return await baseLogRepository.findBizLogPage(params);
  },
  detail: async (id: number) => {
    return await baseLogRepository.findBizLogById(id);
  },
};

const baseLogService = {
  sys,
  audit,
  biz,
};

export default baseLogService;

// ----------------- HTTP APIs -----------------
import type { FromSchema } from "json-schema-to-ts";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  LogSysListReq,
  LogSysListRes,
  LogAuditListReq,
  LogAuditListRes,
  LogBizListReq,
  LogBizListRes,
  LogTimelineReq,
  LogTimelineRes,
  type LogTimelineResItem,
} from "./model";

const sysListApi = {
  req: LogSysListReq,
  res: LogSysListRes,
  pathInfo: { path: "/sys/list", method: "post", summary: "系统日志列表" },
  adapter: bodyAdapter,
  service: async (obj: FromSchema<typeof LogSysListReq>) => {
    return await sys.list({
      namespace: obj.namespace,
      pageNo: obj.pageNo,
      pageSize: obj.pageSize,
      orderBy: obj.orderBy?.[0] as any,
      descend: obj.orderBy?.[1] === "desc",
    });
  },
  permission: { action: "read" },
} satisfies API;

const auditListApi = {
  req: LogAuditListReq,
  res: LogAuditListRes,
  pathInfo: { path: "/audit/list", method: "post", summary: "审计日志列表" },
  adapter: bodyAdapter,
  service: async (obj: FromSchema<typeof LogAuditListReq>) => {
    return await audit.list({
      namespace: obj.namespace,
      pageNo: obj.pageNo,
      pageSize: obj.pageSize,
      orderBy: obj.orderBy?.[0] as any,
      descend: obj.orderBy?.[1] === "desc",
    });
  },
  permission: { action: "read" },
} satisfies API;

const bizListApi = {
  req: LogBizListReq,
  res: LogBizListRes,
  pathInfo: { path: "/biz/list", method: "post", summary: "业务日志列表" },
  adapter: bodyAdapter,
  service: async (obj: FromSchema<typeof LogBizListReq>) => {
    return await biz.list({
      namespace: obj.namespace,
      pageNo: obj.pageNo,
      pageSize: obj.pageSize,
      orderBy: obj.orderBy?.[0] as any,
      descend: obj.orderBy?.[1] === "desc",
    });
  },
  permission: { action: "read" },
} satisfies API;

async function onGetTimeline(obj: FromSchema<typeof LogTimelineReq>) {
  const {
    limit = 50,
    cursor,
    namespaces,
    types = ["sys", "audit", "biz"],
  } = obj;

  const tasks: Promise<any[]>[] = [];
  if (types.includes("sys")) {
    tasks.push(
      baseLogRepository
        .findTimelineChunkSys({ limit, cursor, namespaces })
        .then((rows) => rows.map((r) => ({ ...r, logType: "sys" })))
    );
  }
  if (types.includes("audit")) {
    tasks.push(
      baseLogRepository
        .findTimelineChunkAudit({ limit, cursor, namespaces })
        .then((rows) => rows.map((r) => ({ ...r, logType: "audit" })))
    );
  }
  if (types.includes("biz")) {
    tasks.push(
      baseLogRepository
        .findTimelineChunkBiz({ limit, cursor, namespaces })
        .then((rows) => rows.map((r) => ({ ...r, logType: "biz" })))
    );
  }

  const results = await Promise.all(tasks);
  const allLogs = results.flat();

  // Sort in memory by createTimeUtc desc, then id desc
  allLogs.sort((a, b) => {
    if (b.createTimeUtc !== a.createTimeUtc) {
      return b.createTimeUtc - a.createTimeUtc;
    }
    return b.id - a.id;
  });

  const sliced = allLogs.slice(0, limit);
  const hasMore = allLogs.length > limit;
  const nextCursor =
    sliced.length > 0 ? sliced[sliced.length - 1].createTimeUtc : null;

  return {
    list: sliced,
    nextCursor,
    hasMore,
  };
}

const timelineApi = {
  req: LogTimelineReq,
  res: LogTimelineRes,
  pathInfo: { path: "/timeline", method: "post", summary: "日志时间线" },
  adapter: bodyAdapter,
  service: onGetTimeline,
  permission: { action: "read" },
} satisfies API;

export const apis = {
  sysList: sysListApi,
  auditList: auditListApi,
  bizList: bizListApi,
  timeline: timelineApi,
};
