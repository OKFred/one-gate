import { getTranslation } from "@hodor/core/utils/i18n/shared";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminMaintenanceCronBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { listReqBase } from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { CronExpressionParser } from "cron-parser";
import * as cronRepository from "./repository";

const S = adminMaintenanceCronBackendSchemas;

async function onList(
  params: FromSchema<typeof S.listReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof S.listRes>> {
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword,
    status,
  } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await cronRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    keyword,
    status,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: creatorId } = userObj;
  const { jobKey, name, cronExpression, status = true, parameters } = params;

  let nextRunTimeUtc: number | null = null;
  if (status === true) {
    try {
      const interval = CronExpressionParser.parse(cronExpression);
      nextRunTimeUtc = interval.next().toDate().getTime();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `无效的 Cron 表达式: ${msg}`,
      });
    }
  }

  return await cronRepository.onInsert({
    jobKey,
    name,
    cronExpression,
    status,
    runCount: 0,
    parameters,
    nextRunTimeUtc,
    creatorId,
  });
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, jobKey, name, cronExpression, status, parameters } = params;

  const row = await cronRepository.findById(id);
  preventEmpty(row);

  let nextRunTimeUtc = row.nextRunTimeUtc;
  const targetCron =
    cronExpression !== undefined ? cronExpression : row.cronExpression;
  const targetStatus = status !== undefined ? status : row.status;

  if (targetStatus === true) {
    try {
      const interval = CronExpressionParser.parse(targetCron);
      nextRunTimeUtc = interval.next().toDate().getTime();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
        message: `无效的 Cron 表达式: ${msg}`,
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
    updateTimeUtc: Date.now(),
  };

  const updateRow = await cronRepository.onUpdate(id, updateData);
  preventEmpty(updateRow);
  return updateRow.id;
}

async function onDelete(
  params: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number> {
  const { id } = params;

  const row = await cronRepository.findById(id);
  preventEmpty(row);

  const deleteRow = await cronRepository.onDelete(id);
  preventEmpty(deleteRow);

  return deleteRow.id;
}

async function onGet(
  params: FromSchema<typeof S.getReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = params;
  const row = await cronRepository.findById(id);
  preventEmpty(row);
  return row;
}

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
          status: { type: "boolean" },
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
  _userObj?: UserObj
): Promise<FromSchema<typeof listLogsRes>> {
  const { jobId, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await cronRepository.findLogsPage({
    jobId,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
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

    const nextDates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      nextDates.push(interval.next().toDate());
    }

    const nextTimes = nextDates.map((date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    });

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
  } catch (err: unknown) {
    return {
      valid: false,
      error:
        (err instanceof Error ? err.message : String(err)) ||
        "无效的 Cron 表达式",
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

export default createCrudApis(S, {
  list: {
    adapter: bodyUserAdapter,
    summary: "获取定时任务列表",
    handler: onList,
  },
  add: { summary: "添加定时任务", handler: onAdd },
  update: { summary: "更新定时任务", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除定时任务",
    handler: onDelete,
  },
  get: {
    adapter: bodyUserAdapter,
    summary: "获取定时任务信息",
    handler: onGet,
  },
  extra: {
    listLogs: listLogsApi,
    parse: parseApi,
  },
});
