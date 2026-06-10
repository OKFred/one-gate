import db from "@/db/index";
import { getTranslation } from "@/utils/i18n/shared";
import {
  cronTable,
  cronLogTable,
  IndexVO,
  CronVO,
  CronListVO,
  CronAddVO,
  CronUpdateVO,
  CronListKeys,
  CronDetailKeys,
  CronGetKeys,
  CronDeleteKeys,
  CronAddKeys,
  CronUpdateKeys,
  CronSortableKeys,
  type CronPOLike,
  type CronVOLike,
  type CronAddVOLike,
  type CronUpdateVOLike,
  type CronDeleteVOLike,
  type CronGetVOLike,
  CronBaseVO,
} from "./model";
import { asc, count, desc, eq, and, like, or, isNull } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import hasValue from "@/utils/hasValue";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@/middleware/auth/prevention";
import { CronExpressionParser } from "cron-parser";

// 辅助函数：根据条件构建查询 filter
const buildWhereCondition = (condition?: {
  keyword?: string;
  status?: 0 | 1;
}) => {
  const { keyword, status } = condition || {};
  const conditions = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(cronTable.name, `%${keyword}%`),
        like(cronTable.jobKey, `%${keyword}%`)
      )
    );
  }
  if (hasValue(status)) {
    conditions.push(eq(cronTable.status, status));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

//----------------- 1. 获取任务列表 ----------------//
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    status: { type: "number", enum: [0, 1], description: "状态" },
    orderBy: orderByWrapper<(keyof CronPOLike)[]>(CronSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<CronPOLike>[]>(
    {
      ...CronListVO,
    },
    [...CronListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = cronTable[orderBy] || cronTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const whereCondition = buildWhereCondition(params);

  // 查询总数
  const countResult = await db
    .select({ total: count(cronTable.id) })
    .from(cronTable)
    .where(whereCondition);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }

  // 查询数据
  const rows = await db
    .select()
    .from(cronTable)
    .where(whereCondition)
    .orderBy(descend ? desc(orderField) : asc(orderField))
    .limit(finalPageSize)
    .offset(offset);

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取定时任务列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

//----------------- 2. 新增任务 ----------------//
const addReq = {
  type: "object",
  properties: {
    ...CronAddVO,
  } satisfies Partial<Record<keyof CronAddVOLike, JSONSchema>>,
  required: [...CronAddKeys] as const satisfies RequiredKeys<CronAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const { jobKey, name, cronExpression, status, parameters } = params;

  // 验证 Cron 表达式是否合法，并计算初始下次运行时间
  let nextRunTimeUtc: number | null = null;
  if (status === 1) {
    try {
      const interval = CronExpressionParser.parse(cronExpression);
      nextRunTimeUtc = interval.next().toDate().getTime();
    } catch (err: any) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `无效的 Cron 表达式: ${err.message}`,
      });
    }
  }

  const res = await db
    .insert(cronTable)
    .values({
      jobKey,
      name,
      cronExpression,
      status,
      parameters,
      nextRunTimeUtc,
      creatorId,
    })
    .returning({ id: cronTable.id });

  return res[0]?.id;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加定时任务",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

//----------------- 3. 更新任务 ----------------//
const updateReq = {
  type: "object",
  properties: {
    ...CronUpdateVO,
  },
  required: [
    ...CronUpdateKeys,
  ] as const satisfies RequiredKeys<CronUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { userId: updaterId } = userObj;
  const { id, jobKey, name, cronExpression, status, parameters } = params;

  // 前置校验任务是否存在
  const existRows = await db
    .select()
    .from(cronTable)
    .where(eq(cronTable.id, id))
    .limit(1);
  const row = existRows[0];
  preventEmpty(row);

  // 如果更新了 cron 表达式或者状态，需要重新计算下次运行时间
  let nextRunTimeUtc = row.nextRunTimeUtc;
  const targetCron =
    cronExpression !== undefined ? cronExpression : row.cronExpression;
  const targetStatus = status !== undefined ? status : row.status;

  if (targetStatus === 1) {
    try {
      const interval = CronExpressionParser.parse(targetCron);
      nextRunTimeUtc = interval.next().toDate().getTime();
    } catch (err: any) {
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `无效的 Cron 表达式: ${err.message}`,
      });
    }
  } else {
    nextRunTimeUtc = null;
  }

  const updateData = {
    jobKey,
    name,
    cronExpression,
    status,
    parameters,
    nextRunTimeUtc,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(cronTable)
    .set(updateData)
    .where(eq(cronTable.id, id))
    .returning({ id: cronTable.id });

  const updateRow = res[0];
  preventEmpty(updateRow);
  return updateRow.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新定时任务",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

//----------------- 4. 删除任务 ----------------//
const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...CronDeleteKeys,
  ] as const satisfies RequiredKeys<CronDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;

  const existRows = await db
    .select()
    .from(cronTable)
    .where(eq(cronTable.id, id))
    .limit(1);
  const row = existRows[0];
  preventEmpty(row);

  // 执行删除配置表
  const result = await db
    .delete(cronTable)
    .where(eq(cronTable.id, id))
    .returning({ id: cronTable.id });

  const deleteRow = result[0];
  preventEmpty(deleteRow);

  // 同时清理该定时任务下的所有日志数据
  await db.delete(cronLogTable).where(eq(cronLogTable.jobId, id));

  return deleteRow.id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除定时任务",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

//----------------- 5. 获取任务详情 ----------------//
const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [...CronGetKeys] as const satisfies RequiredKeys<CronGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...CronVO,
  },
  required: [...CronDetailKeys] as const satisfies RequiredKeys<CronVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(cronTable)
    .where(eq(cronTable.id, id))
    .limit(1);
  const row = rows[0];
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取定时任务信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

//----------------- 6. 获取任务运行日志 ----------------//
const listLogsReq = {
  type: "object",
  properties: {
    ...listReqBase,
    jobId: { type: "number", description: "关联的任务ID" },
  },
  required: ["jobId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listLogsRes = {
  type: "object",
  properties: {
    total: { type: "number" },
    totalPage: { type: "number" },
    currentPage: { type: "number" },
    pageSize: { type: "number" },
    list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          jobId: { type: "number" },
          status: { type: "number" },
          errorMessage: { type: ["string", "null"], nullable: true },
          responseBody: { type: ["string", "null"], nullable: true },
          startTimeUtc: { type: "number" },
          endTimeUtc: { type: "number" },
          durationMs: { type: "number" },
        },
        required: [
          "id",
          "jobId",
          "status",
          "startTimeUtc",
          "endTimeUtc",
          "durationMs",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["total", "totalPage", "currentPage", "pageSize", "list"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onListLogs(
  params: FromSchema<typeof listLogsReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listLogsRes>> {
  const { jobId, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(cronLogTable.id) })
    .from(cronLogTable)
    .where(eq(cronLogTable.jobId, jobId));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }

  const rows = await db
    .select()
    .from(cronLogTable)
    .where(eq(cronLogTable.jobId, jobId))
    .orderBy(desc(cronLogTable.id)) // 最新日志排在前面
    .limit(finalPageSize)
    .offset(offset);

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
  };
}

const listLogsApi = {
  req: listLogsReq,
  res: listLogsRes,
  pathInfo: {
    path: "/listLogs",
    method: "post",
    summary: "获取定时任务的执行日志列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onListLogs,
  permission: { action: "read" },
} satisfies API;

//----------------- 7. 解析 Cron 表达式 ----------------//
const parseReq = {
  type: "object",
  properties: {
    cronExpression: { type: "string", description: "Cron 表达式" },
  },
  required: ["cronExpression"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const parseRes = {
  type: "object",
  properties: {
    valid: { type: "boolean" },
    error: { type: ["string", "null"], nullable: true },
    frequency: { type: "string", description: "频率提示文字" },
    nextTimes: {
      type: "array",
      items: { type: "string" },
      description: "未来 5 次的运行时间 (格式化字符串)",
    },
  },
  required: ["valid", "frequency", "nextTimes"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onParse(
  params: FromSchema<typeof parseReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof parseRes>> {
  const { cronExpression } = params;
  try {
    const interval = CronExpressionParser.parse(cronExpression);

    // 取未来 5 次的执行时间
    const nextDates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      nextDates.push(interval.next().toDate());
    }

    const nextTimes = nextDates.map((date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    });

    // 计算频率提示
    const lang = userObj?.langCode || "zh-CN";
    let frequency = await getTranslation(lang, "cron.frequency.custom");

    if (nextDates.length >= 2) {
      const diffMs = nextDates[1].getTime() - nextDates[0].getTime();
      const diffMs2 = nextDates[2].getTime() - nextDates[1].getTime();
      const diffMs3 = nextDates[3].getTime() - nextDates[2].getTime();

      if (diffMs === diffMs2 && diffMs2 === diffMs3) {
        const diffSeconds = Math.round(diffMs / 1000);
        if (diffSeconds === 60) {
          frequency = await getTranslation(lang, "cron.frequency.minutely");
        } else if (
          diffSeconds > 60 &&
          diffSeconds < 3600 &&
          diffSeconds % 60 === 0
        ) {
          const raw = await getTranslation(lang, "cron.frequency.minutes");
          frequency = raw.replace("{minutes}", String(diffSeconds / 60));
        } else if (diffSeconds === 3600) {
          frequency = await getTranslation(lang, "cron.frequency.hourly");
        } else if (
          diffSeconds > 3600 &&
          diffSeconds < 86400 &&
          diffSeconds % 3600 === 0
        ) {
          const raw = await getTranslation(lang, "cron.frequency.hours");
          frequency = raw.replace("{hours}", String(diffSeconds / 3600));
        } else if (diffSeconds === 86400) {
          frequency = await getTranslation(lang, "cron.frequency.daily");
        } else if (diffSeconds > 86400 && diffSeconds % 86400 === 0) {
          const raw = await getTranslation(lang, "cron.frequency.days");
          frequency = raw.replace("{days}", String(diffSeconds / 86400));
        } else {
          const raw = await getTranslation(lang, "cron.frequency.seconds");
          frequency = raw.replace("{seconds}", String(diffSeconds));
        }
      }
    }

    return {
      valid: true,
      error: null,
      frequency,
      nextTimes,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message || "无效的 Cron 表达式",
      frequency: "无法解析频率",
      nextTimes: [],
    };
  }
}

const parseApi = {
  req: parseReq,
  res: parseRes,
  pathInfo: {
    path: "/parse",
    method: "post",
    summary: "解析并验证 Cron 表达式",
  } as const,
  adapter: bodyUserAdapter,
  service: onParse,
  permission: false,
} satisfies API;

//----------------- 统一导出 ----------------//
export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  listLogs: listLogsApi,
  parse: parseApi,
};
