import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { listResBase } from "@hodor/core/middleware/encapsulation/common.schema";

const resourceType = { type: "string", enum: ["department"] } as const;
const id = { type: "integer", minimum: 1 } as const;
const timestamp = { type: "integer", minimum: 0 } as const;

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
export type RecycleBinListInput = FromSchema<typeof RecycleBinListReq>;
export type RecycleBinListOutput = FromSchema<typeof RecycleBinListRes>;
export type RecycleBinMutationInput = FromSchema<typeof RecycleBinMutationReq>;
