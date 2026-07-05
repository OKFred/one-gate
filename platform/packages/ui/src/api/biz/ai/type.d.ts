import * as AiConfigAPI from '@/api/biz/ai/config';
import * as AiChatAPI from '@/api/biz/ai/chat';

// ==================== AI LLM Configuration ====================

/** 获取所有 AI 配置请求 */
export type ListAllAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.listAllFn>[0]['data']>;
/** 获取所有 AI 配置响应 */
export type ListAllAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.listAllFn>>['data']['data'];

/** 分页获取 AI 配置请求 */
export type ListAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.listFn>[0]['data']>;
/** 分页获取 AI 配置响应 */
export type ListAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.listFn>>['data']['data'];

/** 获取 AI 配置详情请求 */
export type GetAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.getFn>[0]['data']>;
/** 获取 AI 配置详情响应 */
export type GetAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.getFn>>['data']['data'];

/** 添加 AI 配置请求 */
export type AddAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.addFn>[0]['data']>;
/** 添加 AI 配置响应 */
export type AddAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.addFn>>['data']['data'];

/** 更新 AI 配置请求 */
export type UpdateAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.updateFn>[0]['data']>;
/** 更新 AI 配置响应 */
export type UpdateAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.updateFn>>['data']['data'];

/** 删除 AI 配置请求 */
export type DeleteAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.deleteFn>[0]['data']>;
/** 删除 AI 配置响应 */
export type DeleteAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.deleteFn>>['data']['data'];

/** 验证 AI 配置连通性请求 */
export type VerifyAiConfigReq = NonNullable<Parameters<typeof AiConfigAPI.verifyFn>[0]['data']>;
/** 验证 AI 配置连通性响应 */
export type VerifyAiConfigRes = Awaited<ReturnType<typeof AiConfigAPI.verifyFn>>['data']['data'];

/** AI 配置对象 */
export type AiLlmConfigObj = ListAiConfigRes['list'][number];

// ==================== AI Chat ====================

/** AI 对话请求 */
export type AskAiReq = NonNullable<Parameters<typeof AiChatAPI.askFn>[0]['data']>;
/** AI 对话响应 */
export type AskAiRes = Awaited<ReturnType<typeof AiChatAPI.askFn>>['data']['data'];
