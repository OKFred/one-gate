import type { FromSchema, JSONSchema } from "json-schema-to-ts";

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
const nullableTime = { ...time, type: ["integer", "null"] } as const;
const uuid = { type: "string", format: "uuid" } as const;
const nullableUuid = { ...uuid, type: ["string", "null"] } as const;
const version = { type: "integer", const: 1 } as const;
const revision = { type: "string", pattern: "^sha256:[0-9a-f]{64}$" } as const;

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

const identityScope = {
  contractVersion: version,
  tenantId: id,
  hostAssetId: uuid,
} as const;
export const TelemetryCatalogReq = objectSchema(identityScope, [
  "contractVersion",
  "tenantId",
  "hostAssetId",
]);

export const TelemetryIdentifierSchema = objectSchema(
  {
    identifierType: { type: "string", enum: ["wwn", "sn"] },
    namespace: { type: "string", enum: ["storage.wwn", "storage.serial"] },
    value: { type: "string", minLength: 1, maxLength: 250 },
    effectiveFromUtc: time,
  },
  ["identifierType", "namespace", "value", "effectiveFromUtc"]
);

export const TelemetryAssignmentSchema = objectSchema(
  {
    assignmentId: id,
    hostAssetId: nullableUuid,
    validFromUtc: time,
    validToUtc: nullableTime,
  },
  ["assignmentId", "hostAssetId", "validFromUtc", "validToUtc"]
);

export const TelemetryHostSchema = objectSchema(
  {
    assetId: uuid,
    status: { type: "string", enum: ["active", "retired"] },
    retiredTimeUtc: nullableTime,
  },
  ["assetId", "status", "retiredTimeUtc"]
);

export const TelemetryAssetSchema = objectSchema(
  {
    ...TelemetryHostSchema.properties,
    model: { type: ["string", "null"], maxLength: 500 },
    identifiers: { type: "array", items: TelemetryIdentifierSchema },
    assignments: { type: "array", items: TelemetryAssignmentSchema },
  },
  [...TelemetryHostSchema.required, "model", "identifiers", "assignments"]
);

export const TelemetryCatalogContentSchema = objectSchema(
  {
    contractVersion: version,
    tenantId: id,
    host: TelemetryHostSchema,
    assets: { type: "array", items: TelemetryAssetSchema },
  },
  ["contractVersion", "tenantId", "host", "assets"]
);

export const TelemetryCatalogRes = objectSchema(
  {
    ...TelemetryCatalogContentSchema.properties,
    revision,
    serverTimeUtc: time,
    expiresTimeUtc: time,
  },
  [
    ...TelemetryCatalogContentSchema.required,
    "revision",
    "serverTimeUtc",
    "expiresTimeUtc",
  ]
);

const observedIdentifier = objectSchema(
  {
    identifierType: { type: "string", minLength: 1, maxLength: 32 },
    namespace: { type: "string", maxLength: 100 },
    value: { type: "string", maxLength: 250 },
  },
  ["identifierType", "namespace", "value"]
);

export const TelemetryResolveItemSchema = objectSchema(
  {
    requestId: { type: "string", minLength: 1, maxLength: 100 },
    observedTimeUtc: time,
    model: { type: ["string", "null"], maxLength: 500 },
    identifiers: { type: "array", maxItems: 4, items: observedIdentifier },
  },
  ["requestId", "observedTimeUtc", "identifiers"]
);

export const TelemetryResolveBatchReq = objectSchema(
  {
    ...identityScope,
    items: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: TelemetryResolveItemSchema,
    },
  },
  [...TelemetryCatalogReq.required, "items"]
);

export const TelemetryReasonCodes = [
  "MATCHED",
  "CATALOG_EXPIRED",
  "INVALID_OBSERVATION_TIME",
  "MISSING_IDENTIFIER",
  "UNSUPPORTED_NAMESPACE",
  "INVALID_IDENTIFIER",
  "IDENTIFIERS_DISAGREE",
  "WWN_UNMAPPED",
  "IDENTIFIER_UNMAPPED",
  "MODEL_REQUIRED",
  "MODEL_MISMATCH",
  "IDENTIFIER_NOT_EFFECTIVE",
  "ASSET_RETIRED",
  "HOST_RETIRED",
  "ASSIGNMENT_MISSING",
  "ASSIGNMENT_CONFLICT",
  "HOST_MISMATCH",
] as const;

export const TelemetryMappingSchema = objectSchema(
  {
    assetId: uuid,
    hostAssetId: uuid,
    assignmentId: id,
    assignmentValidFromUtc: time,
    assignmentValidToUtc: nullableTime,
  },
  [
    "assetId",
    "hostAssetId",
    "assignmentId",
    "assignmentValidFromUtc",
    "assignmentValidToUtc",
  ]
);

export const TelemetryResolveResultSchema = objectSchema(
  {
    requestId: TelemetryResolveItemSchema.properties.requestId,
    observedTimeUtc: time,
    status: { type: "string", enum: ["matched", "unmapped", "conflict"] },
    reasonCode: { type: "string", enum: TelemetryReasonCodes },
    mapping: { anyOf: [TelemetryMappingSchema, { type: "null" }] },
  },
  ["requestId", "observedTimeUtc", "status", "reasonCode", "mapping"]
);

export const TelemetryResolveBatchRes = objectSchema(
  {
    contractVersion: version,
    revision,
    serverTimeUtc: time,
    expiresTimeUtc: time,
    results: {
      type: "array",
      maxItems: 100,
      items: TelemetryResolveResultSchema,
    },
  },
  ["contractVersion", "revision", "serverTimeUtc", "expiresTimeUtc", "results"]
);

export type TelemetryCatalogInput = FromSchema<typeof TelemetryCatalogReq>;
export type TelemetryCatalogContent = FromSchema<
  typeof TelemetryCatalogContentSchema
>;
export type TelemetryCatalog = FromSchema<typeof TelemetryCatalogRes>;
export type TelemetryIdentifier = FromSchema<typeof TelemetryIdentifierSchema>;
export type TelemetryAsset = FromSchema<typeof TelemetryAssetSchema>;
export type TelemetryAssignment = FromSchema<typeof TelemetryAssignmentSchema>;
export type TelemetryResolveItem = FromSchema<
  typeof TelemetryResolveItemSchema
>;
export type TelemetryResolveResult = FromSchema<
  typeof TelemetryResolveResultSchema
>;
export type TelemetryReasonCode = (typeof TelemetryReasonCodes)[number];
export type TelemetryResolveBatchInput = FromSchema<
  typeof TelemetryResolveBatchReq
>;
export type TelemetryResolveBatchResult = FromSchema<
  typeof TelemetryResolveBatchRes
>;
