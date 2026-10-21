import { sql, type InferSelectModel } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
  check,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import type { JSONSchema, FromSchema } from "json-schema-to-ts";
import { tenantTable } from "../tenant/model";

export const AssetCategories = [
  "host",
  "disk",
  "gpu",
  "board",
  "sensor",
  "meter",
  "other",
] as const;
export const AssetStatuses = ["active", "retired"] as const;
export const IdentifierTypes = [
  "sn",
  "wwn",
  "gpu_uuid",
  "sid",
  "other",
] as const;
export const IdentifierConfidence = ["high", "medium", "low"] as const;

const auditColumns = () => ({
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc").notNull(),
  updateTimeUtc: integer("update_time_utc"),
});

export const assetTable = sqliteTable(
  "enterprise_asset",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantTable.id),
    assetId: text("asset_id").notNull(),
    assetCode: text("asset_code"),
    name: text("name").notNull(),
    category: text("category", { enum: AssetCategories }).notNull(),
    brand: text("brand"),
    model: text("model"),
    remark: text("remark"),
    status: text("status", { enum: AssetStatuses }).notNull(),
    retiredTimeUtc: integer("retired_time_utc"),
    stateReason: text("state_reason"),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("enterprise_asset_public_id_unique").on(t.assetId),
    uniqueIndex("enterprise_asset_tenant_id_unique").on(t.tenantId, t.id),
    uniqueIndex("enterprise_asset_tenant_code_unique")
      .on(t.tenantId, t.assetCode)
      .where(sql`${t.assetCode} IS NOT NULL`),
    index("enterprise_asset_tenant_status_idx").on(t.tenantId, t.status, t.id),
    check(
      "enterprise_asset_state_check",
      sql`(${t.status} = 'active' AND ${t.retiredTimeUtc} IS NULL) OR (${t.status} = 'retired' AND ${t.retiredTimeUtc} IS NOT NULL)`
    ),
    check(
      "enterprise_asset_category_check",
      sql`${t.category} IN ('host','disk','gpu','board','sensor','meter','other')`
    ),
  ]
);

export const assetIdentifierTable = sqliteTable(
  "enterprise_asset_identifier",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id").notNull(),
    assetId: integer("asset_id").notNull(),
    identifierType: text("identifier_type", {
      enum: IdentifierTypes,
    }).notNull(),
    namespace: text("namespace").notNull(),
    value: text("value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    source: text("source").notNull(),
    confidence: text("confidence", { enum: IdentifierConfidence }).notNull(),
    isVerified: integer("is_verified", { mode: "boolean" }).notNull(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.assetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_identifier_owner_fk",
    }),
    uniqueIndex("enterprise_asset_identifier_verified_unique")
      .on(t.tenantId, t.identifierType, t.namespace, t.normalizedValue)
      .where(sql`${t.isVerified} = 1`),
    index("enterprise_asset_identifier_asset_idx").on(t.tenantId, t.assetId),
    check(
      "enterprise_asset_identifier_type_check",
      sql`${t.identifierType} IN ('sn','wwn','gpu_uuid','sid','other')`
    ),
    check(
      "enterprise_asset_identifier_confidence_check",
      sql`${t.confidence} IN ('high','medium','low')`
    ),
    check(
      "enterprise_asset_identifier_verified_check",
      sql`${t.isVerified} IN (0,1)`
    ),
  ]
);

export const assetAssignmentTable = sqliteTable(
  "enterprise_asset_assignment",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id").notNull(),
    assetId: integer("asset_id").notNull(),
    hostAssetId: integer("host_asset_id"),
    location: text("location").notNull(),
    validFromUtc: integer("valid_from_utc").notNull(),
    validToUtc: integer("valid_to_utc"),
    reason: text("reason").notNull(),
    closeReason: text("close_reason"),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.assetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_assignment_owner_fk",
    }),
    foreignKey({
      columns: [t.tenantId, t.hostAssetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_assignment_host_fk",
    }),
    index("enterprise_asset_assignment_interval_idx").on(
      t.tenantId,
      t.assetId,
      t.validFromUtc
    ),
    index("enterprise_asset_assignment_host_idx").on(
      t.tenantId,
      t.hostAssetId,
      t.validToUtc
    ),
    check(
      "enterprise_asset_assignment_interval_check",
      sql`${t.validFromUtc} >= 0 AND (${t.validToUtc} IS NULL OR ${t.validToUtc} > ${t.validFromUtc})`
    ),
    check(
      "enterprise_asset_assignment_not_self_check",
      sql`${t.hostAssetId} IS NULL OR ${t.assetId} != ${t.hostAssetId}`
    ),
  ]
);

export const assetMeasurementBindingTable = sqliteTable(
  "enterprise_asset_measurement_binding",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id").notNull(),
    assetId: integer("asset_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    collectorId: text("collector_id").notNull(),
    deviceId: text("device_id").notNull(),
    metric: text("metric").notNull(),
    channel: text("channel").notNull(),
    validFromUtc: integer("valid_from_utc").notNull(),
    validToUtc: integer("valid_to_utc"),
    reason: text("reason").notNull(),
    closeReason: text("close_reason"),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.assetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_binding_owner_fk",
    }),
    index("enterprise_asset_binding_asset_idx").on(
      t.tenantId,
      t.assetId,
      t.validFromUtc
    ),
    index("enterprise_asset_binding_source_idx").on(
      t.tenantId,
      t.sourceSystem,
      t.collectorId,
      t.deviceId,
      t.metric,
      t.channel,
      t.validFromUtc
    ),
    check(
      "enterprise_asset_binding_interval_check",
      sql`${t.validFromUtc} >= 0 AND (${t.validToUtc} IS NULL OR ${t.validToUtc} > ${t.validFromUtc})`
    ),
  ]
);

export type Asset = InferSelectModel<typeof assetTable>;
export type AssetIdentifier = InferSelectModel<typeof assetIdentifierTable>;
export type AssetAssignment = InferSelectModel<typeof assetAssignmentTable>;
export type AssetMeasurementBinding = InferSelectModel<
  typeof assetMeasurementBindingTable
>;

const id = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const time = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const nullableTime = {
  type: ["integer", "null"],
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const nullableId = { ...id, type: ["integer", "null"] } as const;
const shortText = { type: "string", minLength: 1, maxLength: 100 } as const;
const nullableText = { type: ["string", "null"], maxLength: 500 } as const;
const reason = { type: "string", minLength: 1, maxLength: 500 } as const;
const paging = {
  pageNo: { type: "integer", minimum: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: 100 },
  descend: { type: "boolean" },
} as const;
const audit = {
  creatorId: id,
  updaterId: nullableId,
  createTimeUtc: time,
  updateTimeUtc: nullableTime,
} as const;

function objectSchema<
  const P extends Record<string, JSONSchema>,
  const R extends readonly (keyof P & string)[],
>(properties: P, required: R) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  } as const satisfies JSONSchema;
}
function pageSchema<const S extends JSONSchema>(items: S) {
  return objectSchema(
    {
      list: { type: "array", items },
      total: { type: "integer", minimum: 0 },
      totalPage: { type: "integer", minimum: 0 },
      currentPage: id,
      pageSize: id,
    },
    ["list", "total", "totalPage", "currentPage", "pageSize"]
  );
}

export const AssetFields = {
  id,
  tenantId: id,
  assetId: { type: "string", format: "uuid" },
  assetCode: { type: ["string", "null"], maxLength: 100 },
  name: shortText,
  category: { type: "string", enum: AssetCategories },
  brand: nullableText,
  model: nullableText,
  remark: nullableText,
  status: { type: "string", enum: AssetStatuses },
  retiredTimeUtc: nullableTime,
  stateReason: nullableText,
  ...audit,
} as const;
export const AssetRecordSchema = objectSchema(AssetFields, [
  "id",
  "tenantId",
  "assetId",
  "assetCode",
  "name",
  "category",
  "brand",
  "model",
  "remark",
  "status",
  "retiredTimeUtc",
  "stateReason",
  "creatorId",
  "updaterId",
  "createTimeUtc",
  "updateTimeUtc",
]);
export const AssetListReq = objectSchema(
  {
    tenantId: id,
    ...paging,
    keyword: { type: "string", maxLength: 100 },
    category: AssetFields.category,
    status: AssetFields.status,
    orderBy: {
      type: "string",
      enum: [
        "id",
        "name",
        "category",
        "status",
        "createTimeUtc",
        "updateTimeUtc",
      ],
    },
  },
  ["tenantId"]
);
export const AssetListRes = pageSchema(AssetRecordSchema);
export const AssetGetReq = objectSchema({ tenantId: id, id }, [
  "tenantId",
  "id",
]);
export const AssetGetRes = AssetRecordSchema;
const editable = {
  name: shortText,
  category: AssetFields.category,
  assetCode: AssetFields.assetCode,
  brand: nullableText,
  model: nullableText,
  remark: nullableText,
} as const;
export const AssetAddReq = objectSchema({ tenantId: id, ...editable }, [
  "tenantId",
  "name",
  "category",
]);
export const AssetUpdateReq = objectSchema(
  { tenantId: id, id, expectedUpdateTimeUtc: nullableTime, ...editable },
  ["tenantId", "id", "expectedUpdateTimeUtc", "name", "category"]
);
export const AssetStateReq = objectSchema(
  { tenantId: id, id, expectedUpdateTimeUtc: nullableTime, reason },
  ["tenantId", "id", "expectedUpdateTimeUtc", "reason"]
);
export const MutationRes = id;

const identifierFields = {
  id,
  tenantId: id,
  assetId: id,
  identifierType: { type: "string", enum: IdentifierTypes },
  namespace: { type: "string", maxLength: 100 },
  value: { type: "string", minLength: 1, maxLength: 250 },
  normalizedValue: { type: "string", minLength: 1, maxLength: 250 },
  source: { type: "string", minLength: 1, maxLength: 250 },
  confidence: { type: "string", enum: IdentifierConfidence },
  isVerified: { type: "boolean" },
  ...audit,
} as const;
export const IdentifierRecordSchema = objectSchema(identifierFields, [
  "id",
  "tenantId",
  "assetId",
  "identifierType",
  "namespace",
  "value",
  "normalizedValue",
  "source",
  "confidence",
  "isVerified",
  "creatorId",
  "updaterId",
  "createTimeUtc",
  "updateTimeUtc",
]);
const identifierEditable = {
  identifierType: identifierFields.identifierType,
  namespace: identifierFields.namespace,
  value: identifierFields.value,
  source: identifierFields.source,
  confidence: identifierFields.confidence,
  isVerified: identifierFields.isVerified,
} as const;
export const ChildListReq = objectSchema(
  { tenantId: id, assetId: id, ...paging },
  ["tenantId", "assetId"]
);
export const IdentifierListRes = pageSchema(IdentifierRecordSchema);
export const IdentifierAddReq = objectSchema(
  {
    tenantId: id,
    assetId: id,
    expectedAssetUpdateTimeUtc: nullableTime,
    ...identifierEditable,
  },
  [
    "tenantId",
    "assetId",
    "expectedAssetUpdateTimeUtc",
    "identifierType",
    "namespace",
    "value",
    "source",
    "confidence",
    "isVerified",
  ]
);
export const IdentifierUpdateReq = objectSchema(
  { ...IdentifierAddReq.properties, id, expectedUpdateTimeUtc: nullableTime },
  [...IdentifierAddReq.required, "id", "expectedUpdateTimeUtc"]
);

const intervalFields = {
  validFromUtc: time,
  validToUtc: nullableTime,
  reason,
  closeReason: nullableText,
} as const;
const assignmentFields = {
  id,
  tenantId: id,
  assetId: id,
  hostAssetId: nullableId,
  location: { type: "string", maxLength: 250 },
  ...intervalFields,
  ...audit,
} as const;
export const AssignmentRecordSchema = objectSchema(assignmentFields, [
  "id",
  "tenantId",
  "assetId",
  "hostAssetId",
  "location",
  "validFromUtc",
  "validToUtc",
  "reason",
  "closeReason",
  "creatorId",
  "updaterId",
  "createTimeUtc",
  "updateTimeUtc",
]);
export const AssignmentListRes = pageSchema(AssignmentRecordSchema);
export const AssignReq = objectSchema(
  {
    tenantId: id,
    assetId: id,
    expectedAssetUpdateTimeUtc: nullableTime,
    hostAssetId: nullableId,
    location: assignmentFields.location,
    validFromUtc: time,
    validToUtc: nullableTime,
    reason,
    replacesId: id,
    expectedUpdateTimeUtc: nullableTime,
  },
  [
    "tenantId",
    "assetId",
    "expectedAssetUpdateTimeUtc",
    "hostAssetId",
    "location",
    "validFromUtc",
    "reason",
  ]
);
export const CloseRelationReq = objectSchema(
  {
    tenantId: id,
    assetId: id,
    id,
    expectedAssetUpdateTimeUtc: nullableTime,
    expectedUpdateTimeUtc: nullableTime,
    validToUtc: time,
    reason,
  },
  [
    "tenantId",
    "assetId",
    "id",
    "expectedAssetUpdateTimeUtc",
    "expectedUpdateTimeUtc",
    "validToUtc",
    "reason",
  ]
);

export const MeasurementKeyFields = {
  sourceSystem: shortText,
  collectorId: shortText,
  deviceId: shortText,
  metric: shortText,
  channel: { type: "string", maxLength: 100 },
} as const;
const bindingFields = {
  id,
  tenantId: id,
  assetId: id,
  ...MeasurementKeyFields,
  ...intervalFields,
  ...audit,
} as const;
export const BindingRecordSchema = objectSchema(bindingFields, [
  "id",
  "tenantId",
  "assetId",
  "sourceSystem",
  "collectorId",
  "deviceId",
  "metric",
  "channel",
  "validFromUtc",
  "validToUtc",
  "reason",
  "closeReason",
  "creatorId",
  "updaterId",
  "createTimeUtc",
  "updateTimeUtc",
]);
export const BindingListRes = pageSchema(BindingRecordSchema);
export const BindReq = objectSchema(
  {
    tenantId: id,
    assetId: id,
    expectedAssetUpdateTimeUtc: nullableTime,
    ...MeasurementKeyFields,
    validFromUtc: time,
    validToUtc: nullableTime,
    reason,
    replacesId: id,
    expectedUpdateTimeUtc: nullableTime,
  },
  [
    "tenantId",
    "assetId",
    "expectedAssetUpdateTimeUtc",
    "sourceSystem",
    "collectorId",
    "deviceId",
    "metric",
    "channel",
    "validFromUtc",
    "reason",
  ]
);

export const MappingResolveReq = objectSchema(
  { tenantId: id, ...MeasurementKeyFields, observedTimeUtc: time },
  [
    "tenantId",
    "sourceSystem",
    "collectorId",
    "deviceId",
    "metric",
    "channel",
    "observedTimeUtc",
  ]
);
export const MappingProjectionSchema = objectSchema(
  {
    assetId: { type: "string", format: "uuid" },
    bindingId: id,
    ...MeasurementKeyFields,
    validFromUtc: time,
    validToUtc: nullableTime,
    updateTimeUtc: nullableTime,
  },
  [
    "assetId",
    "bindingId",
    "sourceSystem",
    "collectorId",
    "deviceId",
    "metric",
    "channel",
    "validFromUtc",
    "validToUtc",
    "updateTimeUtc",
  ]
);
export const MappingResolveRes = objectSchema(
  {
    status: { type: "string", enum: ["matched", "unmapped"] },
    mapping: { anyOf: [MappingProjectionSchema, { type: "null" }] },
  },
  ["status", "mapping"]
);
export const MappingListReq = objectSchema(
  { tenantId: id, ...paging, sourceSystem: shortText, collectorId: shortText },
  ["tenantId"]
);
export const MappingListRes = pageSchema(MappingProjectionSchema);

export type AssetListInput = FromSchema<typeof AssetListReq>;
export type AssetGetInput = FromSchema<typeof AssetGetReq>;
export type AssetAddInput = FromSchema<typeof AssetAddReq>;
export type AssetUpdateInput = FromSchema<typeof AssetUpdateReq>;
export type AssetStateInput = FromSchema<typeof AssetStateReq>;
export type IdentifierAddInput = FromSchema<typeof IdentifierAddReq>;
export type IdentifierUpdateInput = FromSchema<typeof IdentifierUpdateReq>;
export type ChildListInput = FromSchema<typeof ChildListReq>;
export type AssignInput = FromSchema<typeof AssignReq>;
export type BindInput = FromSchema<typeof BindReq>;
export type CloseRelationInput = FromSchema<typeof CloseRelationReq>;
export type MappingResolveInput = FromSchema<typeof MappingResolveReq>;
export type MappingListInput = FromSchema<typeof MappingListReq>;
