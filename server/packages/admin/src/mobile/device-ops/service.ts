import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import type { API } from "@hodor/core/middleware/encapsulation";
import {
  bodyUserAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import {
  listReqBase,
  listResponseWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import type { Context, UserObj } from "@hodor/core/types/app";
import baseLogService from "../../base/log/service.js";
import { publishDeviceManagementCommand } from "../../mqtt/service.js";
import { findDeviceTaskTarget } from "../device/facade.js";
import {
  decryptSensitiveText,
  hashDeviceToken,
} from "../device/infrastructure/crypto.js";
import { DeviceOpsAuditVO, DeviceOpsSessionVO } from "./model.js";
import { deviceOpsRepository } from "./repository.js";

interface DeviceOpsBindingEnv {
  MOBILE_OPS: DurableObjectNamespace;
}

/** Encode cryptographically random bytes as URL-safe Base64. */
function randomToken(bytes = 32): string {
  let binary = "";
  crypto.getRandomValues(new Uint8Array(bytes)).forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** Return the Durable Object stub for one session. */
function sessionStub(context: Context, sessionId: string): DurableObjectStub {
  const namespace = (context.env as unknown as DeviceOpsBindingEnv).MOBILE_OPS;
  if (!namespace) throw new BusinessError("OPS_REALTIME_UNAVAILABLE");
  return namespace.getByName(sessionId);
}

/** Convert a session database row to its public shape. */
function sessionView(
  row: Awaited<ReturnType<typeof deviceOpsRepository.getSession>>
) {
  if (!row) throw new BusinessError("运维会话不存在");
  const { id: _id, activeClientId: _activeClientId, ...view } = row;
  return view;
}

/** Convert an audit row to non-sensitive index fields. */
function auditView(
  row: Awaited<ReturnType<typeof deviceOpsRepository.getAudit>>
) {
  if (!row) throw new BusinessError("运维审计不存在");
  const { requestCiphertext, responseCiphertext, ...view } = row;
  return view;
}

const openReq = {
  type: "object",
  properties: {
    clientId: DeviceOpsSessionVO.clientId,
    durationMinutes: { type: "integer", minimum: 1, maximum: 30, default: 10 },
  },
  required: ["clientId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const ticketRes = {
  type: "object",
  properties: {
    sessionId: DeviceOpsSessionVO.sessionId,
    status: DeviceOpsSessionVO.status,
    wsUrl: { type: "string" },
    operatorTicket: { type: "string" },
    expiresAtUtc: { type: "integer" },
  },
  required: ["sessionId", "status", "wsUrl", "operatorTicket", "expiresAtUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** Create an asynchronous, short-lived device operations session. */
async function onOpen(
  params: FromSchema<typeof openReq>,
  user: UserObj,
  context: Context
): Promise<FromSchema<typeof ticketRes>> {
  const target = await findDeviceTaskTarget(params.clientId);
  if (!target?.isEnabled) throw new BusinessError("设备不存在或已停用");
  const issuedAt = Date.now();
  const expiresAt = issuedAt + (params.durationMinutes || 10) * 60_000;
  const sessionId = `ops_${crypto.randomUUID().replaceAll("-", "")}`;
  const nonce = randomToken(16);
  const operatorTicket = randomToken();
  const ticketHash = await hashDeviceToken(operatorTicket);
  const requestUrl = new URL(context.req.url);
  requestUrl.protocol = requestUrl.protocol === "https:" ? "wss:" : "ws:";
  requestUrl.pathname = `/api/v1/admin/mobile/device-ops/ws/${sessionId}`;
  requestUrl.search = "";
  requestUrl.hash = "";
  const wsUrl = requestUrl.toString();

  await deviceOpsRepository.createSession({
    sessionId,
    clientId: params.clientId,
    actorId: user.userId,
    actorName: user.username,
    expiresAtUtc: expiresAt,
  });
  const stub = sessionStub(context, sessionId);
  const initResponse = await stub.fetch("https://mobile-ops.internal/init", {
    method: "POST",
    headers: { "content-type": "application/json", "x-ops-internal": "1" },
    body: JSON.stringify({
      sessionId,
      clientId: params.clientId,
      actorId: user.userId,
      ticketHash,
      expiresAt,
    }),
  });
  if (!initResponse.ok) throw new BusinessError("运维实时会话初始化失败");
  try {
    await publishDeviceManagementCommand({
      topic: `autojs6/ops/v1/devices/${params.clientId}/commands`,
      payload: {
        protocolVersion: 1,
        type: "OPEN_SESSION",
        sessionId,
        deviceId: params.clientId,
        wsUrl,
        nonce,
        issuedAt,
        expiresAt,
      },
      actor: { userId: user.userId, username: user.username },
      sessionId,
      clientId: params.clientId,
      commandType: "OPEN_SESSION",
    });
  } catch (error) {
    await deviceOpsRepository.updateSession(sessionId, {
      status: "REJECTED",
      code: "OPS_MQTT_PUBLISH_FAILED",
      message: error instanceof Error ? error.message : String(error),
      terminal: true,
    });
    await stub.fetch("https://mobile-ops.internal/close", {
      method: "POST",
      headers: { "x-ops-internal": "1" },
    });
    throw error;
  }
  return {
    sessionId,
    status: "PENDING_DEVICE",
    wsUrl,
    operatorTicket,
    expiresAtUtc: expiresAt,
  };
}

const openApi = {
  req: openReq,
  res: ticketRes,
  pathInfo: {
    path: "/session/open",
    method: "post",
    summary: "开启短期设备运维会话",
  },
  adapter: bodyUserContextAdapter,
  service: onOpen,
  permission: { action: "write" },
} satisfies API;

const sessionIdReq = {
  type: "object",
  properties: { sessionId: DeviceOpsSessionVO.sessionId },
  required: ["sessionId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const sessionRes = {
  type: "object",
  properties: DeviceOpsSessionVO,
  required: Object.keys(DeviceOpsSessionVO),
  additionalProperties: false,
} as const satisfies JSONSchema;

/** Get one operations session. */
const getApi = {
  req: sessionIdReq,
  res: sessionRes,
  pathInfo: {
    path: "/session/get",
    method: "post",
    summary: "查询设备运维会话",
  },
  adapter: bodyUserAdapter,
  service: async (params: FromSchema<typeof sessionIdReq>) =>
    sessionView(await deviceOpsRepository.getSession(params.sessionId)),
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: { ...listReqBase, clientId: DeviceOpsSessionVO.clientId },
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = listResponseWrapper(
  DeviceOpsSessionVO,
  Object.keys(DeviceOpsSessionVO)
);

/** List operations sessions. */
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/session/list",
    method: "post",
    summary: "分页查询设备运维会话",
  },
  adapter: bodyUserAdapter,
  service: async (params: FromSchema<typeof listReq>) => {
    const pageNo = params.pageNo || 1;
    const pageSize = params.pageSize || 20;
    const result = await deviceOpsRepository.listSessions({
      clientId: params.clientId,
      pageNo,
      pageSize,
    });
    return { ...result, pageNo, pageSize };
  },
  permission: { action: "read" },
} satisfies API;

/** Ensure only the creating operator or a super administrator controls a session. */
async function requireSessionOwner(sessionId: string, user: UserObj) {
  const row = await deviceOpsRepository.getSession(sessionId);
  if (!row) throw new BusinessError("运维会话不存在");
  if (row.actorId !== user.userId && !user.isSuperAdmin) {
    throw new BusinessError("只能管理自己创建的运维会话");
  }
  return row;
}

/** Issue a new one-time browser reconnect ticket. */
const reconnectApi = {
  req: sessionIdReq,
  res: ticketRes,
  pathInfo: {
    path: "/session/reconnect",
    method: "post",
    summary: "刷新运维会话浏览器票据",
  },
  adapter: bodyUserContextAdapter,
  service: async (
    params: FromSchema<typeof sessionIdReq>,
    user: UserObj,
    context: Context
  ) => {
    const row = await requireSessionOwner(params.sessionId, user);
    if (!row.activeClientId || row.expiresAtUtc <= Date.now()) {
      throw new BusinessError("运维会话已结束");
    }
    const operatorTicket = randomToken();
    const response = await sessionStub(context, row.sessionId).fetch(
      "https://mobile-ops.internal/ticket",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-ops-internal": "1" },
        body: JSON.stringify({
          ticketHash: await hashDeviceToken(operatorTicket),
        }),
      }
    );
    if (!response.ok) throw new BusinessError("运维会话票据刷新失败");
    const url = new URL(context.req.url);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `/api/v1/admin/mobile/device-ops/ws/${row.sessionId}`;
    url.search = "";
    return {
      sessionId: row.sessionId,
      status: row.status,
      wsUrl: url.toString(),
      operatorTicket,
      expiresAtUtc: row.expiresAtUtc,
    };
  },
  permission: { action: "write" },
} satisfies API;

/** Close an operations session immediately. */
const closeApi = {
  req: sessionIdReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/session/close",
    method: "post",
    summary: "关闭设备运维会话",
  },
  adapter: bodyUserContextAdapter,
  service: async (
    params: FromSchema<typeof sessionIdReq>,
    user: UserObj,
    context: Context
  ) => {
    await requireSessionOwner(params.sessionId, user);
    await sessionStub(context, params.sessionId).fetch(
      "https://mobile-ops.internal/close",
      {
        method: "POST",
        headers: { "x-ops-internal": "1" },
      }
    );
    await deviceOpsRepository.updateSession(params.sessionId, {
      status: "CLOSED",
      code: "OPS_OPERATOR_CLOSED",
      message: "Operations session was closed by its operator",
      terminal: true,
    });
    return true;
  },
  permission: { action: "write" },
} satisfies API;

const auditListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    clientId: DeviceOpsSessionVO.clientId,
    sessionId: DeviceOpsSessionVO.sessionId,
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
const auditListRes = listResponseWrapper(
  DeviceOpsAuditVO,
  Object.keys(DeviceOpsAuditVO)
);

/** List non-sensitive operation audit indexes. */
const auditListApi = {
  req: auditListReq,
  res: auditListRes,
  pathInfo: {
    path: "/audit/list",
    method: "post",
    summary: "分页查询设备运维审计",
  },
  adapter: bodyUserAdapter,
  service: async (params: FromSchema<typeof auditListReq>) => {
    const pageNo = params.pageNo || 1;
    const pageSize = params.pageSize || 20;
    const result = await deviceOpsRepository.listAudits({
      clientId: params.clientId,
      sessionId: params.sessionId,
      pageNo,
      pageSize,
    });
    return {
      list: result.list.map(auditView),
      total: result.total,
      pageNo,
      pageSize,
    };
  },
  permission: { action: "read" },
} satisfies API;

const revealReq = {
  type: "object",
  properties: { id: { type: "integer", minimum: 1 } },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** Reveal encrypted request and result to super administrators only. */
const revealApi = {
  req: revealReq,
  res: {
    type: "object",
    properties: { request: {}, response: {} },
    required: ["request", "response"],
    additionalProperties: false,
  } as const,
  pathInfo: {
    path: "/audit/reveal",
    method: "post",
    summary: "解密查看设备运维审计内容",
  },
  adapter: bodyUserAdapter,
  service: async (params: FromSchema<typeof revealReq>, user: UserObj) => {
    if (!user.isSuperAdmin)
      throw new BusinessError("仅超级管理员可查看完整运维审计");
    const row = await deviceOpsRepository.getAudit(params.id);
    if (!row) throw new BusinessError("运维审计不存在");
    const request = JSON.parse(
      await decryptSensitiveText(
        row.requestCiphertext,
        `mobile-ops:${row.sessionId}:${row.requestId}:request`
      )
    ) as unknown;
    const response = row.responseCiphertext
      ? (JSON.parse(
          await decryptSensitiveText(
            row.responseCiphertext,
            `mobile-ops:${row.sessionId}:${row.requestId}:response`
          )
        ) as unknown)
      : null;
    await baseLogService.biz.add({
      namespace: "mobile.device_ops.reveal",
      status: true,
      payloadType: "json",
      remark: `超级管理员查看了设备运维审计 ${row.id}`,
      creatorId: user.userId,
      creatorName: user.username,
      logValue: {
        auditId: row.id,
        sessionId: row.sessionId,
        requestId: row.requestId,
      },
    });
    return { request, response };
  },
  permission: { action: "read" },
} satisfies API;

export default {
  open: openApi,
  get: getApi,
  list: listApi,
  reconnect: reconnectApi,
  close: closeApi,
  auditList: auditListApi,
  auditReveal: revealApi,
};
