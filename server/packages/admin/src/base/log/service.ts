import * as baseLogRepository from "./repository";
import type { SysLogPOLike, AuditLogPOLike, BizLogPOLike } from "./model";
import type { InferInsertModel } from "drizzle-orm";
import {
  baseSysLogTable,
  baseAuditLogTable,
  baseBizLogTable,
  baseHttpRequestLogTable,
} from "./model";

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
    likeFilters?: Record<string, string>;
    status?: boolean;
    startTime?: number;
    endTime?: number;
  }) => {
    return await baseLogRepository.findBizLogPage(params);
  },
  detail: async (id: number) => {
    return await baseLogRepository.findBizLogById(id);
  },
};

const http = {
  add: async (data: InferInsertModel<typeof baseHttpRequestLogTable>) => {
    return await baseLogRepository.insertHttpRequestLog(data);
  },
  list: async (params: {
    namespace?: string;
    method?: string;
    protocol?: string;
    responseStatus?: number;
    keyword?: string;
    creatorId?: number;
    pageNo: number;
    pageSize: number;
    orderBy?: keyof typeof baseHttpRequestLogTable.$inferSelect;
    descend?: boolean;
  }) => {
    return await baseLogRepository.findHttpRequestLogPage(params);
  },
};

const baseLogService = {
  sys,
  audit,
  biz,
  http,
};

export default baseLogService;

// ----------------- HTTP APIs -----------------
import type { FromSchema } from "json-schema-to-ts";
import {
  adminBaseLogAuditBackendSchemas,
  adminBaseLogBizBackendSchemas,
  adminBaseLogHttpBackendSchemas,
  adminBaseLogSysBackendSchemas,
} from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { LogTimelineReq, LogTimelineRes } from "./model";

const sysApis = createCrudApis(adminBaseLogSysBackendSchemas, {
  list: {
    path: "/sys/list",
    adapter: bodyAdapter,
    summary: "系统日志列表",
    handler: async (
      obj: FromSchema<typeof adminBaseLogSysBackendSchemas.listReq>
    ) => {
      const pageNo = obj.pageNo ?? 1;
      const pageSize = obj.pageSize ?? 10;
      const { total, list } = await sys.list({
        namespace: obj.namespace,
        pageNo,
        pageSize,
        orderBy: obj.orderBy,
        descend: obj.descend,
      });
      return buildPagedListResult(
        list.map((row) => ({
          id: row.id,
          namespace: row.namespace,
          logLevel: row.logLevel,
          createTimeUtc: row.createTimeUtc,
          logValue: row.logValue as FromSchema<
            typeof adminBaseLogSysBackendSchemas.listRes
          >["list"][number]["logValue"],
          payloadType: row.payloadType,
          tenantId: row.tenantId ?? null,
          remark: row.remark ?? null,
          creatorId: row.creatorId,
          creatorName: row.creatorName ?? null,
        })),
        total,
        pageNo,
        pageSize
      );
    },
  },
});

const auditApis = createCrudApis(adminBaseLogAuditBackendSchemas, {
  list: {
    path: "/audit/list",
    adapter: bodyAdapter,
    summary: "审计日志列表",
    handler: async (
      obj: FromSchema<typeof adminBaseLogAuditBackendSchemas.listReq>
    ) => {
      const pageNo = obj.pageNo ?? 1;
      const pageSize = obj.pageSize ?? 10;
      const { total, list } = await audit.list({
        namespace: obj.namespace,
        pageNo,
        pageSize,
        orderBy: obj.orderBy,
        descend: obj.descend,
      });
      return buildPagedListResult(
        list.map((row) => ({
          id: row.id,
          namespace: row.namespace,
          action: row.action,
          createTimeUtc: row.createTimeUtc,
          creatorName: row.creatorName ?? null,
          beforeData: (row.beforeData ?? null) as FromSchema<
            typeof adminBaseLogAuditBackendSchemas.listRes
          >["list"][number]["beforeData"],
          afterData: (row.afterData ?? null) as FromSchema<
            typeof adminBaseLogAuditBackendSchemas.listRes
          >["list"][number]["afterData"],
          targetId: row.targetId ?? null,
          payloadType: row.payloadType,
          tenantId: row.tenantId ?? null,
          remark: row.remark ?? null,
          creatorId: row.creatorId,
        })),
        total,
        pageNo,
        pageSize
      );
    },
  },
});

const bizApis = createCrudApis(adminBaseLogBizBackendSchemas, {
  list: {
    path: "/biz/list",
    adapter: bodyAdapter,
    summary: "业务日志列表",
    handler: async (
      obj: FromSchema<typeof adminBaseLogBizBackendSchemas.listReq>
    ) => {
      const pageNo = obj.pageNo ?? 1;
      const pageSize = obj.pageSize ?? 10;
      const { total, list } = await biz.list({
        namespace: obj.namespace,
        pageNo,
        pageSize,
        orderBy: obj.orderBy,
        descend: obj.descend,
      });
      return buildPagedListResult(
        list.map((row) => ({
          id: row.id,
          namespace: row.namespace,
          status: row.status ?? null,
          payloadType: row.payloadType,
          createTimeUtc: row.createTimeUtc,
          logValue: row.logValue as FromSchema<
            typeof adminBaseLogBizBackendSchemas.listRes
          >["list"][number]["logValue"],
          tenantId: row.tenantId ?? null,
          remark: row.remark ?? null,
          creatorId: row.creatorId,
          creatorName: row.creatorName ?? null,
        })),
        total,
        pageNo,
        pageSize
      );
    },
  },
});

const httpApis = createCrudApis(adminBaseLogHttpBackendSchemas, {
  list: {
    path: "/http/list",
    adapter: bodyAdapter,
    summary: "HTTP外网请求日志列表",
    handler: async (
      obj: FromSchema<typeof adminBaseLogHttpBackendSchemas.listReq>
    ) => {
      const pageNo = obj.pageNo ?? 1;
      const pageSize = obj.pageSize ?? 10;
      const { total, list } = await http.list({
        namespace: obj.namespace,
        method: obj.method,
        protocol: obj.protocol ?? undefined,
        responseStatus: obj.responseStatus ?? undefined,
        keyword: obj.keyword,
        pageNo,
        pageSize,
        orderBy: obj.orderBy,
        descend: obj.descend,
      });
      return buildPagedListResult(
        list.map((row) => ({
          id: row.id,
          namespace: row.namespace,
          method: row.method,
          url: row.url,
          responseStatus: row.responseStatus ?? null,
          durationMs: row.durationMs ?? null,
          createTimeUtc: row.createTimeUtc,
          protocol: row.protocol ?? null,
          host: row.host ?? null,
          path: row.path ?? null,
          query: row.query ?? null,
          requestHeaders: (row.requestHeaders ?? null) as Record<
            string,
            unknown
          > | null,
          requestBody: (row.requestBody ?? null) as FromSchema<
            typeof adminBaseLogHttpBackendSchemas.listRes
          >["list"][number]["requestBody"],
          responseHeaders: (row.responseHeaders ?? null) as Record<
            string,
            unknown
          > | null,
          responseBody: (row.responseBody ?? null) as FromSchema<
            typeof adminBaseLogHttpBackendSchemas.listRes
          >["list"][number]["responseBody"],
          errorMessage: row.errorMessage ?? null,
          tenantId: row.tenantId ?? null,
          remark: row.remark ?? null,
          creatorId: row.creatorId,
          creatorName: row.creatorName ?? null,
        })),
        total,
        pageNo,
        pageSize
      );
    },
  },
});

const sysListApi = sysApis.list;
const auditListApi = auditApis.list;
const bizListApi = bizApis.list;
const httpListApi = httpApis.list;

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
  httpList: httpListApi,
  timeline: timelineApi,
};
