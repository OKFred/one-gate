import type { JSONSchema } from "json-schema-to-ts";
import {
  UserLoginResultKeys,
  UserTokenVO,
  UserVO,
} from "../../../../user/model.js";

export const SsoRedirectUriVO = {
  type: "string",
  format: "uri",
  maxLength: 2048,
  description: "SSO 回调地址，必须与服务端白名单精确匹配",
} as const satisfies JSONSchema;

export const SsoUrlReq = {
  type: "object",
  properties: { redirectUri: SsoRedirectUriVO },
  required: ["redirectUri"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SsoUrlRes = {
  type: "object",
  properties: { url: { type: "string", format: "uri" } },
  required: ["url"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SsoCallbackReq = {
  type: "object",
  properties: {
    code: { type: "string", minLength: 1, maxLength: 4096 },
    state: { type: "string", minLength: 32, maxLength: 256 },
  },
  required: ["code", "state"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SsoLoginRes = {
  type: "object",
  properties: {
    userObj: {
      type: "object",
      properties: {
        id: UserVO.id,
        username: UserVO.username,
        langCode: UserVO.langCode,
        token: UserTokenVO.token,
      },
      required: [...UserLoginResultKeys] as const,
      additionalProperties: false,
    },
  },
  required: ["userObj"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SsoMessageRes = {
  type: "object",
  properties: { message: { type: "string" } },
  required: ["message"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SsoEmptyReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SsoBindingSummaryRes = {
  type: "object",
  properties: {
    bound: { type: "boolean" },
    issuer: { type: ["string", "null"] },
    tenantId: { type: ["string", "null"] },
    membershipId: { type: ["string", "null"] },
    clientId: { type: ["string", "null"] },
    amr: { type: "array", items: { type: "string" } },
    scope: { type: "array", items: { type: "string" } },
    createTimeUtc: { type: ["number", "null"] },
    updateTimeUtc: { type: ["number", "null"] },
  },
  required: [
    "bound",
    "issuer",
    "tenantId",
    "membershipId",
    "clientId",
    "amr",
    "scope",
    "createTimeUtc",
    "updateTimeUtc",
  ] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
