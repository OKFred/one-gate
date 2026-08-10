import { and, desc, eq, isNull, like, lt, ne, or, sql } from "drizzle-orm";

import db from "@hodor/core/db";

import {
  mobileDeviceEventTable,
  mobileDeviceTable,
  type DeviceEventType,
  type MobileDeviceAddVOLike,
  type MobileDeviceEventPOLike,
  type MobileDevicePOLike,
  type MobileDeviceUpdateVOLike,
} from "./model";

type DeviceSnapshotUpdate = Partial<
  Omit<MobileDevicePOLike, "id" | "clientId" | "creatorId" | "createTimeUtc">
>;

export class MobileDeviceRepository {
  /** 新增一台管理设备。 */
  async add(
    data: MobileDeviceAddVOLike & { creatorId: number }
  ): Promise<number> {
    const [result] = await db
      .insert(mobileDeviceTable)
      .values(data)
      .returning({ id: mobileDeviceTable.id });
    return result.id;
  }

  /** 更新管理员维护字段。 */
  async update(
    data: MobileDeviceUpdateVOLike & { updaterId: number }
  ): Promise<void> {
    const { id, ...update } = data;
    await db
      .update(mobileDeviceTable)
      .set({
        ...update,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileDeviceTable.id, id));
  }

  /** 更新设备可信上报快照。 */
  async updateSnapshot(
    clientId: string,
    data: DeviceSnapshotUpdate
  ): Promise<void> {
    await db
      .update(mobileDeviceTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(mobileDeviceTable.clientId, clientId));
  }

  /** 删除设备及其事件。 */
  async delete(id: number): Promise<void> {
    const row = await this.getById(id);
    if (!row) return;
    await db
      .delete(mobileDeviceEventTable)
      .where(eq(mobileDeviceEventTable.clientId, row.clientId));
    await db.delete(mobileDeviceTable).where(eq(mobileDeviceTable.id, id));
  }

  /** 按主键获取设备。 */
  async getById(id: number): Promise<MobileDevicePOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.id, id));
    return result;
  }

  /** 按 clientId 获取设备。 */
  async getByClientId(
    clientId: string
  ): Promise<MobileDevicePOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.clientId, clientId));
    return result;
  }

  /** 分页查询设备，在线状态按 150 秒窗口实时判定。 */
  async list(params: {
    pageNo: number;
    pageSize: number;
    keyword?: string;
    isEnabled?: boolean;
    onlineStatus?: "ONLINE" | "OFFLINE";
    onlineCutoff: number;
    orderBy?: keyof MobileDevicePOLike;
    descend?: boolean;
  }) {
    const {
      pageNo,
      pageSize,
      keyword,
      isEnabled,
      onlineStatus,
      onlineCutoff,
      orderBy,
      descend,
    } = params;
    const onlineCondition = and(
      eq(mobileDeviceTable.reportedStatus, "ONLINE"),
      sql`${mobileDeviceTable.lastHeartbeatTimeUtc} >= ${onlineCutoff}`
    );
    const offlineCondition = or(
      isNull(mobileDeviceTable.reportedStatus),
      ne(mobileDeviceTable.reportedStatus, "ONLINE"),
      isNull(mobileDeviceTable.lastHeartbeatTimeUtc),
      lt(mobileDeviceTable.lastHeartbeatTimeUtc, onlineCutoff)
    );
    const whereCondition = and(
      keyword
        ? or(
            like(mobileDeviceTable.clientId, `%${keyword}%`),
            like(mobileDeviceTable.deviceName, `%${keyword}%`),
            like(mobileDeviceTable.model, `%${keyword}%`)
          )
        : undefined,
      isEnabled === undefined
        ? undefined
        : eq(mobileDeviceTable.isEnabled, isEnabled),
      onlineStatus === "ONLINE"
        ? onlineCondition
        : onlineStatus === "OFFLINE"
          ? offlineCondition
          : undefined
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileDeviceTable)
      .where(whereCondition);

    let query = db
      .select()
      .from(mobileDeviceTable)
      .where(whereCondition)
      .$dynamic();
    if (orderBy) {
      query = query.orderBy(
        descend ? desc(mobileDeviceTable[orderBy]) : mobileDeviceTable[orderBy]
      );
    } else {
      query = query.orderBy(desc(mobileDeviceTable.createTimeUtc));
    }
    const list = await query.limit(pageSize).offset((pageNo - 1) * pageSize);
    return {
      list,
      total: count,
      totalPage: Math.ceil(count / pageSize),
      currentPage: pageNo,
      pageNo,
      pageSize,
    };
  }

  /** 幂等插入一条设备事件。 */
  async insertEvent(
    data: Omit<MobileDeviceEventPOLike, "id" | "createTimeUtc">
  ): Promise<boolean> {
    const rows = await db
      .insert(mobileDeviceEventTable)
      .values(data)
      .onConflictDoNothing({
        target: [
          mobileDeviceEventTable.clientId,
          mobileDeviceEventTable.eventId,
        ],
      })
      .returning({ id: mobileDeviceEventTable.id });
    return rows.length > 0;
  }

  /** 分页查询设备 30 天内事件。 */
  async listEvents(params: {
    clientId: string;
    pageNo: number;
    pageSize: number;
    eventType?: DeviceEventType;
    startTimeUtc?: number;
    endTimeUtc?: number;
  }) {
    const whereCondition = and(
      eq(mobileDeviceEventTable.clientId, params.clientId),
      params.eventType
        ? eq(mobileDeviceEventTable.eventType, params.eventType)
        : undefined,
      params.startTimeUtc !== undefined
        ? sql`${mobileDeviceEventTable.eventTimeUtc} >= ${params.startTimeUtc}`
        : undefined,
      params.endTimeUtc !== undefined
        ? sql`${mobileDeviceEventTable.eventTimeUtc} <= ${params.endTimeUtc}`
        : undefined
    );
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileDeviceEventTable)
      .where(whereCondition);
    const list = await db
      .select()
      .from(mobileDeviceEventTable)
      .where(whereCondition)
      .orderBy(desc(mobileDeviceEventTable.eventTimeUtc))
      .limit(params.pageSize)
      .offset((params.pageNo - 1) * params.pageSize);
    return {
      list,
      total: count,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
      totalPage: Math.ceil(count / params.pageSize),
      currentPage: params.pageNo,
    };
  }

  /** 按主键获取一条设备事件。 */
  async getEventById(id: number): Promise<MobileDeviceEventPOLike | undefined> {
    const [row] = await db
      .select()
      .from(mobileDeviceEventTable)
      .where(eq(mobileDeviceEventTable.id, id));
    return row;
  }

  /** 将超过在线窗口的设备状态校正为离线。 */
  async markTimedOutOffline(cutoff: number, now: number): Promise<number> {
    const rows = await db
      .update(mobileDeviceTable)
      .set({
        reportedStatus: "OFFLINE",
        lastOfflineTimeUtc: now,
        updateTimeUtc: now,
      })
      .where(
        and(
          eq(mobileDeviceTable.reportedStatus, "ONLINE"),
          lt(mobileDeviceTable.lastHeartbeatTimeUtc, cutoff)
        )
      )
      .returning({ id: mobileDeviceTable.id });
    return rows.length;
  }

  /** 清理截止时间之前的设备事件。 */
  async deleteEventsBefore(cutoff: number): Promise<number> {
    const rows = await db
      .delete(mobileDeviceEventTable)
      .where(lt(mobileDeviceEventTable.createTimeUtc, cutoff))
      .returning({ id: mobileDeviceEventTable.id });
    return rows.length;
  }
}

export const mobileDeviceRepo = new MobileDeviceRepository();
