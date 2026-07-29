import type { JSONSchema } from "json-schema-to-ts";
import {
  IndexPO,
  IndexVO,
  IndexKey,
  type IndexKeyLike,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- Base PO ----------------//

const MailLogBasePO = {
  mailTo: {
    type: "string",
    format: "email",
    description: "收件人邮箱地址",
    examples: ["receiver@example.com"],
  },
  mailFrom: {
    type: "string",
    format: "email",
    description: "发件人邮箱地址",
    examples: ["sender@example.com"],
  },
  title: {
    type: "string",
    description: "邮件标题",
    examples: ["Welcome to register on our platform!"],
  },
  templateId: {
    type: ["string", "null"],
    nullable: true,
    description: "邮件模板ID",
  },
  templateParams: {
    type: ["string", "null"],
    nullable: true,
    description: "邮件模板参数",
  },
  sendStatus: {
    type: "boolean",
    description: "发送状态",
  },
  exceptionCode: {
    type: ["string", "null"],
    nullable: true,
    description: "异常代码",
  },
  exceptionDetails: {
    type: ["string", "null"],
    nullable: true,
    description: "异常详情",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

export const MailLogPO = {
  ...IndexPO,
  ...MailLogBasePO,
  creatorId: { type: "number", description: "创建人ID" },
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人名称",
  },
  createTimeUtc: { type: "number", description: "创建时间(UTC)" },
} as const satisfies Record<string, JSONSchema>;

export type MailLogPOLike = {
  id: number;
  mailTo: string;
  mailFrom: string;
  title: string;
  templateId: string | null;
  templateParams: string | null;
  sendStatus: boolean;
  exceptionCode: string | null;
  exceptionDetails: string | null;
  remark: string | null;
  creatorId: number;
  creatorName: string | null;
  createTimeUtc: number;
};

//----------------- VO ----------------//
export { IndexVO };
export const MailLogBaseVO = MailLogBasePO;
export const MailLogVO = {
  ...IndexVO,
  ...MailLogBaseVO,
  creatorId: { type: "number", description: "创建人ID" },
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人名称",
  },
  createTimeUtc: { type: "number", description: "创建时间(UTC)" },
} as const satisfies Partial<Record<keyof MailLogVOLike, JSONSchema>>;

export const MailLogListVO = MailLogVO;
export const MailLogAddVO = {
  ...MailLogBaseVO,
} as const satisfies Partial<Record<keyof MailLogVOLike, JSONSchema>>;
export const MailLogUpdateVO = {
  ...IndexVO,
  ...MailLogBaseVO,
} as const satisfies Partial<Record<keyof MailLogVOLike, JSONSchema>>;

export type MailLogVOLike = MailLogPOLike;
export type MailLogAddVOLike = Omit<
  MailLogPOLike,
  "id" | "creatorId" | "creatorName" | "createTimeUtc"
>;
export type MailLogUpdateVOLike = Partial<MailLogAddVOLike> &
  Pick<MailLogPOLike, IndexKeyLike>;
export type MailLogDeleteVOLike = Pick<MailLogVOLike, IndexKeyLike>;
export type MailLogGetVOLike = Pick<MailLogVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const MailLogAddKeys = [
  "mailTo",
  "mailFrom",
  "title",
  "sendStatus",
] as const satisfies RequiredKeys<MailLogAddVOLike>[];

export const MailLogUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailLogUpdateVOLike>[];

export const MailLogDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailLogDeleteVOLike>[];

export const MailLogGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailLogGetVOLike>[];

const MailLogBaseKeys = [
  ...IndexKey,
  ...MailLogAddKeys,
  "templateId",
  "templateParams",
  "exceptionCode",
  "exceptionDetails",
  "remark",
  "creatorId",
  "creatorName",
  "createTimeUtc",
] as const satisfies RequiredKeys<MailLogPOLike>[];

export const MailLogListKeys = MailLogBaseKeys;
export const MailLogDetailKeys = MailLogBaseKeys;
export const MailLogUniqueKeys = [] as const;

// 可排序字段
export const MailLogSortableKeys = [
  "id",
  "mailTo",
  "mailFrom",
  "sendStatus",
  "createTimeUtc",
] as const satisfies RequiredKeys<MailLogPOLike>[];
