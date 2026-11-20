import type { MailLogPOLike } from "./model";
import type { FromSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminMailLogBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { registry } from "../../common/registry";

const S = adminMailLogBackendSchemas;

interface BizLogSourceItem {
  id: number;
  logValue: unknown;
  remark?: string | null;
  creatorId: number;
  creatorName?: string | null;
  createTimeUtc: number;
}

function mapBizLogToMailLog(item: BizLogSourceItem): MailLogPOLike {
  const val = (
    typeof item.logValue === "object" && item.logValue !== null
      ? item.logValue
      : {}
  ) as Partial<MailLogPOLike>;
  return {
    id: item.id,
    mailTo: val.mailTo ?? "",
    mailFrom: val.mailFrom ?? "",
    title: val.title ?? "",
    templateId: val.templateId ?? null,
    templateParams: val.templateParams ?? null,
    sendStatus: Boolean(val.sendStatus),
    exceptionCode: val.exceptionCode ?? null,
    exceptionDetails: val.exceptionDetails ?? null,
    remark: item.remark ?? null,
    creatorId: item.creatorId,
    creatorName: item.creatorName ?? null,
    createTimeUtc: item.createTimeUtc,
  };
}

function sortMailLogsByField(
  rows: MailLogPOLike[],
  orderBy: string,
  descend: boolean
) {
  rows.sort((a, b) => {
    if (orderBy === "mailTo" || orderBy === "mailFrom") {
      return descend
        ? b[orderBy].localeCompare(a[orderBy])
        : a[orderBy].localeCompare(b[orderBy]);
    }
    const aNum = Number(a[orderBy as keyof MailLogPOLike] ?? 0);
    const bNum = Number(b[orderBy as keyof MailLogPOLike] ?? 0);
    return descend ? bNum - aNum : aNum - bNum;
  });
}

async function onListAll(
  params: FromSchema<typeof S.listAllReq>
): Promise<FromSchema<typeof S.listAllRes>> {
  const {
    orderBy = "id",
    descend = true,
    sendStatus,
    templateId,
    startTimeUtc,
    endTimeUtc,
  } = params;

  const filters: Record<string, unknown> = {};
  if (sendStatus !== undefined) filters.sendStatus = sendStatus;
  if (templateId !== undefined) filters.templateId = templateId;

  // For listAll, we pass a very large pageSize to fetch all records matching filters
  const { list } = await registry.base.log.biz.list({
    namespace: "mail",
    pageNo: 1,
    pageSize: 10000,
    orderBy:
      orderBy === "id" || orderBy === "createTimeUtc" ? orderBy : undefined,
    descend,
    filters,
    startTime: startTimeUtc,
    endTime: endTimeUtc,
  });

  const mappedList = list.map(mapBizLogToMailLog);

  if (orderBy && orderBy !== "id" && orderBy !== "createTimeUtc") {
    sortMailLogsByField(mappedList, orderBy, descend);
  }

  return mappedList;
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    sendStatus,
    templateId,
    startTimeUtc,
    endTimeUtc,
  } = params;
  const finalPageSize = Math.min(pageSize, 1000);

  const filters: Record<string, unknown> = {};
  if (sendStatus !== undefined) filters.sendStatus = sendStatus;
  if (templateId !== undefined) filters.templateId = templateId;

  const { total, list } = await registry.base.log.biz.list({
    namespace: "mail",
    pageNo,
    pageSize: finalPageSize,
    orderBy:
      orderBy === "id" || orderBy === "createTimeUtc" ? orderBy : undefined,
    descend,
    filters,
    startTime: startTimeUtc,
    endTime: endTimeUtc,
  });

  const mappedList = list.map(mapBizLogToMailLog);

  if (orderBy && orderBy !== "id" && orderBy !== "createTimeUtc") {
    sortMailLogsByField(mappedList, orderBy, descend);
  }

  return buildPagedListResult(mappedList, total, pageNo, finalPageSize);
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number> {
  const creatorId = userObj.id || userObj.userId;
  const username = userObj.username;
  const { remark, ...logValue } = obj;

  const creatorName = username || String(creatorId);

  const insertedId = await registry.base.log.biz.add({
    namespace: "mail",
    status: !obj.exceptionCode && Boolean(obj.sendStatus),
    payloadType: "json",
    logValue,
    remark,
    creatorId,
    creatorName,
  });

  if (!insertedId) {
    throw new Error("添加邮件日志失败");
  }
  return insertedId;
}

async function onGet(
  obj: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = obj;
  const row = await registry.base.log.biz.detail(id);
  preventEmpty(row);

  if (row.namespace !== "mail") {
    throw new Error("邮件日志不存在");
  }

  return mapBizLogToMailLog(row);
}

export default createCrudApis(S, {
  listAll: {
    path: "/list_all",
    summary: "获取邮件日志全量列表",
    handler: onListAll,
  },
  list: {
    summary: "获取邮件日志列表",
    handler: onList,
  },
  add: {
    summary: "添加邮件日志",
    handler: onAdd,
  },
  get: {
    summary: "获取邮件日志",
    handler: onGet,
  },
});
