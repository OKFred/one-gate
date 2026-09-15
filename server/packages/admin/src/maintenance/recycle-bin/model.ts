import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { listResBase } from "@hodor/core/middleware/encapsulation/common.schema";
import {
  RECYCLE_BIN_RESOURCE_TYPE_MAX_LENGTH,
  RECYCLE_BIN_RESOURCE_TYPE_PATTERN,
} from "@hodor/core/db/recycle-bin";

const resourceType = {
  type: "string",
  pattern: RECYCLE_BIN_RESOURCE_TYPE_PATTERN,
  maxLength: RECYCLE_BIN_RESOURCE_TYPE_MAX_LENGTH,
} as const;
const id = {
  anyOf: [
    { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    { type: "string", minLength: 1, maxLength: 256, pattern: "\\S" },
  ],
} as const;
const timestamp = { type: "integer", minimum: 0 } as const;

export const RecycleBinResourcesReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

export const RecycleBinResourcesRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          resourceType,
          labelKey: { type: "string" },
          canRestore: { type: "boolean" },
          canPurge: { type: "boolean" },
        },
        required: ["resourceType", "labelKey", "canRestore", "canPurge"],
        additionalProperties: false,
      },
    },
  },
  required: ["list"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const RecycleBinItemVO = {
  resourceType,
  id,
  name: { type: "string" },
  deleterId: { type: ["integer", "null"] },
  deleterName: { type: ["string", "null"] },
  deletedTimeUtc: timestamp,
  expiresTimeUtc: timestamp,
  canRestore: { type: "boolean" },
} as const satisfies Record<string, JSONSchema>;

export const RecycleBinListReq = {
  type: "object",
  properties: {
    resourceType,
    keyword: { type: "string", maxLength: 100 },
    pageNo: { type: "integer", minimum: 1, maximum: 1_000_000 },
    pageSize: { type: "integer", minimum: 1, maximum: 100 },
  },
  required: ["resourceType"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const RecycleBinListRes = {
  type: "object",
  properties: {
    ...listResBase,
    canRestore: { type: "boolean" },
    canPurge: { type: "boolean" },
    list: {
      type: "array",
      items: {
        type: "object",
        properties: RecycleBinItemVO,
        required: [
          "resourceType",
          "id",
          "name",
          "deleterId",
          "deleterName",
          "deletedTimeUtc",
          "expiresTimeUtc",
          "canRestore",
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    "list",
    "total",
    "totalPage",
    "currentPage",
    "pageSize",
    "canRestore",
    "canPurge",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const RecycleBinMutationReq = {
  type: "object",
  properties: {
    resourceType,
    id,
    expectedDeletedTimeUtc: timestamp,
  },
  required: ["resourceType", "id", "expectedDeletedTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const RecycleBinMutationRes = id;
export type RecycleBinResourcesInput = FromSchema<
  typeof RecycleBinResourcesReq
>;
export type RecycleBinResourcesOutput = FromSchema<
  typeof RecycleBinResourcesRes
>;
export type RecycleBinListInput = FromSchema<typeof RecycleBinListReq>;
export type RecycleBinListOutput = FromSchema<typeof RecycleBinListRes>;
export type RecycleBinMutationInput = FromSchema<typeof RecycleBinMutationReq>;
