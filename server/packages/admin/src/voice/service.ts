import type { FromSchema } from "json-schema-to-ts";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { UserObj } from "@hodor/core/types/app";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError/index";
import {
  VoiceMeetingCreateReqSchema,
  VoiceMeetingCreateResSchema,
  VoiceJoinReqSchema,
  VoiceJoinResSchema,
  VoiceEndReqSchema,
  VoiceEndResSchema,
  VoiceSessionListReqSchema,
  VoiceSessionListResSchema,
} from "./model.js";
import * as voiceRepository from "./repository.js";
import { registry } from "../common/registry.js";

// ─── RTK Config Helper ────────────────────────────────────────────────────────

interface RtkConfig {
  accountId: string;
  apiToken: string;
  appId: string;
}

import { voiceConfigProvider } from "./driver.js";

/**
 * 从数据库读取 RealtimeKit 动态配置
 *
 * @returns RtkConfig 配置对象
 * @throws BusinessError 若必要环境变量未配置
 */
async function getRtkConfig(): Promise<RtkConfig> {
  const config = await voiceConfigProvider.getActiveConfig();
  if (!config) {
    throw new BusinessError("RealtimeKit 未配置，请先在配置管理中添加凭证");
  }

  const accountId = config.cfAccountId;
  const apiToken = config.rtkApiToken;
  const appId = config.rtkAppId;

  if (!accountId || !apiToken || !appId) {
    throw new BusinessError(
      "RealtimeKit 凭证不完整，请检查 CF Account ID / API Token / App ID"
    );
  }

  return { accountId, apiToken, appId };
}

/**
 * 构造 Cloudflare Realtime Kit API 请求 Headers
 *
 * @param apiToken CF API Token 凭证
 * @returns 包含 Content-Type 与 Bearer Token 的 HTTP 请求头对象
 */
function rtkHeaders(apiToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiToken}`,
  };
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * 创建 RealtimeKit 通话会话
 *
 * @param params 创建参数（可选 title）
 * @param userObj 当前登录用户信息
 * @returns 包含 meetingId、taskId 与 EXECUTING 状态的结果
 */
async function onCreateMeeting(
  params: FromSchema<typeof VoiceMeetingCreateReqSchema>,
  userObj?: UserObj
) {
  const { accountId, apiToken, appId } = await getRtkConfig();

  const res = await registry.base.httpFetch.fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings`,
    {
      method: "POST",
      headers: rtkHeaders(apiToken),
      body: JSON.stringify({ title: params.title ?? "HODOR_TALK Session" }),
      namespace: "voice.meeting.create",
      remark: "Voice Meeting Create",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new BusinessError(`创建通话会话失败: ${res.status} ${text}`);
  }

  const jsonText = await res.text();
  const json = JSON.parse(jsonText);

  // Try to extract meetingId from different possible structures
  const meetingId = json?.data?.id;

  if (!meetingId) {
    throw new BusinessError(
      `创建通话会话失败：RealtimeKit 未返回 meetingId, 返回内容: ${jsonText}`
    );
  }

  const taskId = `voice_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

  await voiceRepository.insertSessionLog({
    meetingId,
    meetingTitle: params.title ?? null,
    status: "active",
    taskId,
    creatorId: userObj?.id ?? 0,
    updateTimeUtc: null,
    endTimeUtc: null,
  });

  return {
    meetingId,
    taskId,
    status: "EXECUTING",
  };
}

/**
 * 创建通话会话 API
 */
export const createMeetingApi = {
  req: VoiceMeetingCreateReqSchema,
  res: VoiceMeetingCreateResSchema,
  pathInfo: {
    path: "/meeting",
    method: "post",
    summary: "创建 RealtimeKit 通话会话",
  },
  adapter: bodyUserAdapter,
  service: onCreateMeeting,
  permission: { action: "add" },
} satisfies API;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 为当前用户加入已有通话会话，获取 authToken
 *
 * @param params 包含 meetingId（必填）与可选 displayName
 * @param userObj 当前登录用户信息
 * @returns authToken（用于前端 SDK 初始化）及 meetingId
 */
async function onJoinMeeting(
  params: FromSchema<typeof VoiceJoinReqSchema>,
  userObj?: UserObj
) {
  const { accountId, apiToken, appId } = await getRtkConfig();

  const session = await voiceRepository.findSessionByMeetingId(
    params.meetingId
  );
  if (!session) {
    throw new BusinessError(`通话会话不存在: ${params.meetingId}`);
  }

  const isHost = userObj?.id && userObj.id === session.creatorId;
  const preset = isHost ? "group_call_host" : "group_call_guest";

  const displayName =
    params.displayName ?? userObj?.username ?? `user_${userObj?.id ?? 0}`;

  const customParticipantId = userObj?.id
    ? String(userObj.id)
    : `guest_${crypto.randomUUID().substring(0, 8)}`;

  const res = await registry.base.httpFetch.fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${params.meetingId}/participants`,
    {
      method: "POST",
      headers: rtkHeaders(apiToken),
      body: JSON.stringify({
        name: displayName,
        preset_name: preset,
        custom_participant_id: customParticipantId,
      }),
      namespace: "voice.meeting.join",
      remark: "Voice Meeting Join",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new BusinessError(`加入通话会话失败: ${res.status} ${text}`);
  }

  const jsonText = await res.text();
  const json = JSON.parse(jsonText);

  // Extract token from possible structures
  const authToken = json?.data?.token || json?.result?.token || json?.token;

  if (!authToken) {
    throw new BusinessError(
      `加入通话会话失败：RealtimeKit 未返回 authToken, 返回内容: ${jsonText}`
    );
  }

  return {
    authToken,
    meetingId: params.meetingId,
  };
}

/**
 * 加入通话会话 API
 */
export const joinMeetingApi = {
  req: VoiceJoinReqSchema,
  res: VoiceJoinResSchema,
  pathInfo: {
    path: "/join",
    method: "post",
    summary: "加入通话会话，获取参与者 authToken",
  },
  adapter: bodyUserAdapter,
  service: onJoinMeeting,
  permission: { action: "add" },
} satisfies API;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 结束通话会话（更新本地日志状态）
 *
 * @param params 包含 meetingId
 * @param userObj 当前登录用户信息
 */
async function onEndMeeting(
  params: FromSchema<typeof VoiceEndReqSchema>,
  _userObj?: UserObj
) {
  const session = await voiceRepository.findSessionByMeetingId(
    params.meetingId
  );

  if (!session) {
    throw new BusinessError(`通话会话不存在: ${params.meetingId}`);
  }

  // 尝试通知 Cloudflare RealtimeKit 释放/销毁会议资源
  try {
    const { accountId, apiToken, appId } = await getRtkConfig();
    await registry.base.httpFetch.fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}/meetings/${params.meetingId}`,
      {
        method: "DELETE",
        headers: rtkHeaders(apiToken),
        namespace: "voice.meeting.end",
        remark: "Voice Meeting End",
      }
    );
  } catch {}

  const nowUtc = Date.now();
  await voiceRepository.updateSessionLog(params.meetingId, {
    status: "ended",
    endTimeUtc: nowUtc,
    updateTimeUtc: nowUtc,
  });

  return {};
}

/**
 * 结束通话会话 API
 */
export const endMeetingApi = {
  req: VoiceEndReqSchema,
  res: VoiceEndResSchema,
  pathInfo: {
    path: "/meeting/end",
    method: "post",
    summary: "结束通话会话（更新本地日志状态为 ended）",
  },
  adapter: bodyAdapter,
  service: onEndMeeting,
  permission: { action: "edit" },
} satisfies API;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * 分页查询通话会话日志列表
 *
 * @param params 分页与状态过滤参数
 * @returns 会话日志列表及分页信息
 */
async function onListSessions(
  params: FromSchema<typeof VoiceSessionListReqSchema>
) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const result = await voiceRepository.findSessionPage({
    page,
    pageSize,
    status: params.status ?? null,
  });

  return {
    list: result.list,
    total: result.total,
    page,
    pageSize,
  };
}

/**
 * 查询通话会话日志列表 API
 */
export const listSessionsApi = {
  req: VoiceSessionListReqSchema,
  res: VoiceSessionListResSchema,
  pathInfo: {
    path: "/meeting/list",
    method: "post",
    summary: "分页查询通话会话历史记录",
  },
  adapter: bodyAdapter,
  service: onListSessions,
  permission: { action: "read" },
} satisfies API;

// ─────────────────────────────────────────────────────────────────────────────

const service = {
  meeting: createMeetingApi,
  join: joinMeetingApi,
  "meeting/end": endMeetingApi,
  "meeting/list": listSessionsApi,
};

export default service;
