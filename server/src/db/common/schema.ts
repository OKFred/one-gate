import { JSONSchema } from "json-schema-to-ts";

/** @description 主键 */
export type IndexKeyLike = "id";
/** @description 新增时省略的审计字段 */
export type AuditAddOmitKeyLike =
  | "createTimeUtc"
  | "updaterId"
  | "updateTimeUtc";
/** @description 更新时省略的审计字段 */
export type AuditUpdateOmitKeyLike = "creatorId" | "createTimeUtc";

export const IndexPO = {
  id: {
    type: "number",
    description: "id",
    examples: [1],
  },
} as const satisfies Partial<Record<string, JSONSchema>>;

export const AddAuditPO = {
  creatorId: {
    type: "number",
    description: "创建者ID",
  },
  /* createTimeUtc: {
    type: "number",
    description: "创建时间",
    examples: [1672531199000],
  }, */ // 由数据库默认值生成
} as const satisfies Partial<Record<string, JSONSchema>>;

export const UpdateAuditPO = {
  updaterId: {
    type: "number",
    description: "更新者ID",
    nullable: true,
  },
  updateTimeUtc: {
    type: "number",
    nullable: true,
    description: "更新时间",
    examples: [1672531199000],
  },
} as const satisfies Partial<Record<string, JSONSchema>>;

export const AuditPO = {
  creatorId: {
    type: "number",
    description: "创建者ID",
  },
  createTimeUtc: {
    type: "number",
    description: "创建时间",
    examples: [1672531199000],
  },
  updaterId: {
    type: "number",
    description: "更新者ID",
    nullable: true,
  },
  updateTimeUtc: {
    type: "number",
    nullable: true,
    description: "更新时间",
    examples: [1672531199000],
  },
} as const satisfies Partial<Record<string, JSONSchema>>;

export const AuditKeys = [
  "creatorId",
  "createTimeUtc",
  "updaterId",
  "updateTimeUtc",
] as const;
export const IndexVO = IndexPO;
export const AuditVO = AuditPO;
// 不需要定义，因为这些字段在服务器端自动生成，不通过请求体传递
// export const AddAuditVO = AddAuditPO;
// export const UpdateAuditVO = UpdateAuditPO;
