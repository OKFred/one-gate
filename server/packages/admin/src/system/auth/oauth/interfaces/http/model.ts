import type { JSONSchema } from "json-schema-to-ts";
import {
  UserLoginResultKeys,
  UserTokenVO,
  UserVO,
} from "../../../../user/model.js";

export const OAuthProviderVO = {
  type: "string",
  enum: ["github", "feishu"],
  description: "OAuth Provider",
} as const satisfies JSONSchema;

export const OAuthIntentVO = {
  type: "string",
  enum: ["bind", "unbind"],
  description: "账号操作意图",
} as const satisfies JSONSchema;

export const OAuthRedirectUriVO = {
  type: "string",
  format: "uri",
  maxLength: 2048,
  description: "固定指向 /oauth/callback 的前端回调地址",
} as const satisfies JSONSchema;

export const OAuthUrlReq = {
  type: "object",
  properties: {
    provider: OAuthProviderVO,
    redirectUri: OAuthRedirectUriVO,
  },
  required: ["provider", "redirectUri"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthAccountUrlReq = {
  type: "object",
  properties: {
    provider: OAuthProviderVO,
    redirectUri: OAuthRedirectUriVO,
    intent: OAuthIntentVO,
  },
  required: ["provider", "redirectUri"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthUrlRes = {
  type: "object",
  properties: { url: { type: "string", format: "uri" } },
  required: ["url"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthCallbackReq = {
  type: "object",
  properties: {
    code: { type: "string", minLength: 1, maxLength: 4096 },
    state: { type: "string", minLength: 32, maxLength: 256 },
  },
  required: ["code", "state"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthLoginRes = {
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

export const OAuthAccountCallbackRes = {
  type: "object",
  properties: {
    message: { type: "string" },
    unbound: { type: "boolean" },
  },
  required: ["message", "unbound"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthBindingUnbindReq = {
  type: "object",
  properties: {
    provider: OAuthProviderVO,
    redirectUri: OAuthRedirectUriVO,
  },
  required: ["provider"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthBindingUnbindRes = {
  type: "object",
  properties: {
    message: { type: "string" },
    unbound: { type: "boolean" },
    reauthorizationRequired: { type: "boolean" },
    url: { type: "string", format: "uri" },
  },
  required: ["message", "unbound", "reauthorizationRequired"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthBindingProfileReq = {
  type: "object",
  properties: { provider: OAuthProviderVO },
  required: ["provider"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthBindingProfileRes = {
  type: "object",
  properties: {
    provider: OAuthProviderVO,
    providerId: { type: "string" },
    providerUsername: { type: ["string", "null"] },
    providerTenantId: { type: ["string", "null"] },
    profile: { type: "object", additionalProperties: true },
    lastVerifiedAtUtc: { type: ["number", "null"] },
  },
  required: [
    "provider",
    "providerId",
    "providerUsername",
    "providerTenantId",
    "profile",
    "lastVerifiedAtUtc",
  ] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

export const OAuthBindingSummaryVO = {
  type: "object",
  properties: {
    provider: OAuthProviderVO,
    providerUsername: { type: ["string", "null"] },
    providerTenantId: { type: ["string", "null"] },
    lastVerifiedAtUtc: { type: ["number", "null"] },
    hasProfile: { type: "boolean" },
  },
  required: [
    "provider",
    "providerUsername",
    "providerTenantId",
    "lastVerifiedAtUtc",
    "hasProfile",
  ] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
