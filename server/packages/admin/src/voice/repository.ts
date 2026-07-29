import db from "@hodor/core/db/index";
import { voiceSessionLogTable } from "./model.js";
import { desc, eq, count, and, type SQL } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type VoiceSessionLogInsert = InferInsertModel<
  typeof voiceSessionLogTable
>;
export type VoiceSessionLogSelect = InferSelectModel<
  typeof voiceSessionLogTable
>;

/**
 * 插入新通话会话日志记录
 *
 * @param data 会话日志字段（不含 id、createTimeUtc）
 * @returns 新插入记录的 id
 */
export async function insertSessionLog(
  data: VoiceSessionLogInsert
): Promise<number> {
  const result = await db
    .insert(voiceSessionLogTable)
    .values(data)
    .returning({ id: voiceSessionLogTable.id });
  return result[0]!.id;
}

/**
 * 根据 meetingId 查询单条会话日志
 *
 * @param meetingId RealtimeKit 会话 ID
 * @returns 会话日志记录，不存在则返回 undefined
 */
export async function findSessionByMeetingId(
  meetingId: string
): Promise<VoiceSessionLogSelect | undefined> {
  const rows = await db
    .select()
    .from(voiceSessionLogTable)
    .where(eq(voiceSessionLogTable.meetingId, meetingId))
    .limit(1);
  return rows[0];
}

/**
 * 更新会话日志状态及结束时间
 *
 * @param meetingId RealtimeKit 会话 ID
 * @param fields 待更新字段（status、endTimeUtc、updateTimeUtc）
 */
export async function updateSessionLog(
  meetingId: string,
  fields: {
    status?: string;
    endTimeUtc?: number;
    updateTimeUtc?: number;
  }
): Promise<void> {
  await db
    .update(voiceSessionLogTable)
    .set(fields)
    .where(eq(voiceSessionLogTable.meetingId, meetingId));
}

/**
 * 分页查询通话会话日志列表
 *
 * @param params 分页与状态过滤参数
 * @returns 列表与总条数
 */
export async function findSessionPage(params: {
  page: number;
  pageSize: number;
  status?: string | null;
  creatorId?: number;
}): Promise<{ list: VoiceSessionLogSelect[]; total: number }> {
  const { page, pageSize, status, creatorId } = params;
  const offset = (page - 1) * pageSize;

  const conditions: SQL[] = [];
  if (status) {
    conditions.push(eq(voiceSessionLogTable.status, status));
  }
  if (creatorId !== undefined) {
    conditions.push(eq(voiceSessionLogTable.creatorId, creatorId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [list, [countRow]] = await Promise.all([
    db
      .select()
      .from(voiceSessionLogTable)
      .where(where)
      .orderBy(desc(voiceSessionLogTable.createTimeUtc))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(voiceSessionLogTable).where(where),
  ]);

  return {
    list,
    total: countRow?.total ?? 0,
  };
}
