const nullableString = { type: ["string", "null"] } as const;
const nullableInteger = { type: ["integer", "null"] } as const;

export const AuthorizationEmptyReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const AuthorizationConnectionSaveReq = {
  type: "object",
  properties: {
    issuer: { type: "string", minLength: 1, maxLength: 2048 },
    authorizationBaseUrl: { type: "string", minLength: 1, maxLength: 2048 },
    audience: { type: "string", minLength: 1, maxLength: 2048 },
    clientId: { type: "string", minLength: 1, maxLength: 128 },
    clientSecret: { type: "string", minLength: 16, maxLength: 4096 },
    expectedVersion: { type: "integer", minimum: 0 },
  },
  required: [
    "issuer",
    "authorizationBaseUrl",
    "audience",
    "clientId",
    "expectedVersion",
  ],
  additionalProperties: false,
} as const;

export const AuthorizationConnectionVersionReq = {
  type: "object",
  properties: {
    expectedVersion: { type: "integer", minimum: 1 },
  },
  required: ["expectedVersion"],
  additionalProperties: false,
} as const;

export const AuthorizationConnectionSummaryRes = {
  type: "object",
  properties: {
    configured: { type: "boolean" },
    status: {
      anyOf: [
        { type: "string", enum: ["draft", "ready", "disabled"] },
        { type: "null" },
      ],
    },
    issuer: nullableString,
    authorizationBaseUrl: nullableString,
    audience: nullableString,
    clientId: nullableString,
    hasClientSecret: { type: "boolean" },
    configVersion: { type: "integer", minimum: 0 },
    lastTestedAtUtc: nullableInteger,
    updateTimeUtc: nullableInteger,
  },
  required: [
    "configured",
    "status",
    "issuer",
    "authorizationBaseUrl",
    "audience",
    "clientId",
    "hasClientSecret",
    "configVersion",
    "lastTestedAtUtc",
    "updateTimeUtc",
  ],
  additionalProperties: false,
} as const;

const cedarScalar = {
  anyOf: [
    { type: "boolean" },
    { type: "integer" },
    { type: "string", maxLength: 16384 },
  ],
} as const;

const cedarPilotValue = {
  anyOf: [
    ...cedarScalar.anyOf,
    { type: "array", maxItems: 1000, items: cedarScalar },
  ],
} as const;

const cedarPilotRecord = {
  type: "object",
  maxProperties: 256,
  additionalProperties: cedarPilotValue,
} as const;

export const AuthorizationPilotDecisionReq = {
  type: "object",
  properties: {
    action: {
      type: "string",
      pattern: "^[A-Za-z_][A-Za-z0-9_]{0,127}$",
    },
    resource: {
      type: "object",
      properties: {
        type: {
          type: "string",
          pattern: "^[A-Za-z_][A-Za-z0-9_]{0,127}$",
        },
        id: { type: "string", minLength: 1, maxLength: 512 },
        attributes: cedarPilotRecord,
      },
      required: ["type", "id", "attributes"],
      additionalProperties: false,
    },
    context: cedarPilotRecord,
  },
  required: ["action", "resource", "context"],
  additionalProperties: false,
} as const;

export const AuthorizationPilotDecisionRes = {
  type: "object",
  properties: {
    decisionId: { type: "string", minLength: 1, maxLength: 128 },
    allowed: { type: "boolean" },
    reason: { type: "string", enum: ["POLICY_ALLOW", "POLICY_DENY"] },
    policyRevision: { type: "integer", minimum: 1 },
    authorizationRequestId: { type: "string", minLength: 1, maxLength: 64 },
  },
  required: [
    "decisionId",
    "allowed",
    "reason",
    "policyRevision",
    "authorizationRequestId",
  ],
  additionalProperties: false,
} as const;
