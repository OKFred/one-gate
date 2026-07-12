import {
  IndexVO,
  ComplianceArchiveVO,
  ComplianceArchiveListVO,
  ComplianceArchiveListKeys,
  ComplianceArchiveDetailKeys,
  ComplianceArchiveGetKeys,
  ComplianceArchiveSortableKeys,
  type ComplianceArchivePOLike,
  type ComplianceArchiveVOLike,
  type ComplianceArchiveGetVOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import * as complianceRepository from "./repository";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    keyword: {
      type: "string",
      description: "关键字搜索（主键）",
    },
    sourceTable: ComplianceArchiveVO["sourceTable"],
    deleteReason: ComplianceArchiveVO["deleteReason"],
    deleteType: ComplianceArchiveVO["deleteType"],
    restorable: ComplianceArchiveVO["restorable"],
    orderBy: orderByWrapper<(keyof ComplianceArchivePOLike)[]>(
      ComplianceArchiveSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<ComplianceArchivePOLike>[]>(
    {
      ...ComplianceArchiveListVO,
    },
    [...ComplianceArchiveListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await complianceRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
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
    summary: "获取合规归档记录列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

/**
 * 导出函数：在表记录删除时调用，将删除信息归档
 * @param data 归档数据
 * @param creatorId 创建者ID（删除人）
 * @returns 归档记录ID
 */
export async function exportDeletionRecord(
  data: {
    sourceSystem?: string | "self";
    sourceDatabase?: string | "self";
    sourceTable: string;
    sourcePrimaryKey: string | "id";
    deleteReason?: string | "personal_data" | "system";
    deleteType?: string | "anonymize" | "purge";
    recordSnapshot?: string;
    remark?: string;
    restorable?: boolean;
    restoreUntilTimeUtc?: number;
    complianceNote?: string | "(EU) 2016/679" | "(CN) PIPL 2021";
  },
  creatorId: number
): Promise<number | null> {
  const insertData = {
    sourceSystem: data.sourceSystem || "self",
    sourceDatabase: data.sourceDatabase || "self",
    sourceTable: data.sourceTable,
    sourcePrimaryKey: data.sourcePrimaryKey || "id",
    deleteReason: data.deleteReason || null,
    deleteType: data.deleteType || null,
    recordSnapshot: data.recordSnapshot || null,
    remark: data.remark || null,
    restorable: data.restorable ?? false,
    restoreUntilTimeUtc: data.restoreUntilTimeUtc || null,
    restoredTimeUtc: null,
    restorerId: null,
    complianceNote: data.complianceNote || null,
    creatorId,
  };

  return await complianceRepository.onInsert(insertData);
}

export default {
  // list: listApi,
};
