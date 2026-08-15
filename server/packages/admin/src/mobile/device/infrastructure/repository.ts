import { and, desc, eq, isNull, like, lt, ne, or, sql } from "drizzle-orm";

import db from "@hodor/core/db";
import type {
  DeviceAdminUpdateRecord,
  DeviceCreateRecord,
  DeviceEventListParams,
  DeviceEventPage,
  DeviceEventRecord,
  DeviceListParams,
  DevicePage,
  DeviceRecord,
  DeviceRepositoryPort,
  DeviceSnapshotUpdate,
} from "../application/ports.js";
import { mobileDeviceEventTable, mobileDeviceTable } from "../model.js";

export class DrizzleDeviceRepository implements DeviceRepositoryPort {
  async add(data: DeviceCreateRecord): Promise<number> {
    const [result] = await db
      .insert(mobileDeviceTable)
      .values(data)
      .returning({ id: mobileDeviceTable.id });
    return result.id;
  }

  async update(data: DeviceAdminUpdateRecord): Promise<void> {
    const { id, ...update } = data;
    await db
      .update(mobileDeviceTable)
      .set({
        ...update,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileDeviceTable.id, id));
  }

  async updateSnapshot(
    clientId: string,
    data: DeviceSnapshotUpdate
  ): Promise<void> {
    await db
      .update(mobileDeviceTable)
      .set({ ...data, updateTimeUtc: Date.now() })
      .where(eq(mobileDeviceTable.clientId, clientId));
  }

  async delete(id: number): Promise<void> {
    const row = await this.getById(id);
    if (!row) return;
    await db
      .delete(mobileDeviceEventTable)
      .where(eq(mobileDeviceEventTable.clientId, row.clientId));
    await db.delete(mobileDeviceTable).where(eq(mobileDeviceTable.id, id));
  }

  async getById(id: number): Promise<DeviceRecord | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.id, id));
    return result;
  }

  async getByClientId(clientId: string): Promise<DeviceRecord | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.clientId, clientId));
    return result;
  }

  async list(params: DeviceListParams): Promise<DevicePage> {
    const onlineCondition = and(
      eq(mobileDeviceTable.reportedStatus, "ONLINE"),
      sql`${mobileDeviceTable.lastHeartbeatTimeUtc} >= ${params.onlineCutoff}`
    );
    const offlineCondition = or(
      isNull(mobileDeviceTable.reportedStatus),
      ne(mobileDeviceTable.reportedStatus, "ONLINE"),
      isNull(mobileDeviceTable.lastHeartbeatTimeUtc),
      lt(mobileDeviceTable.lastHeartbeatTimeUtc, params.onlineCutoff)
    );
    const whereCondition = and(
      params.keyword
        ? or(
            like(mobileDeviceTable.clientId, `%${params.keyword}%`),
            like(mobileDeviceTable.deviceName, `%${params.keyword}%`),
            like(mobileDeviceTable.model, `%${params.keyword}%`)
          )
        : undefined,
      params.isEnabled === undefined
        ? undefined
        : eq(mobileDeviceTable.isEnabled, params.isEnabled),
      params.onlineStatus === "ONLINE"
        ? onlineCondition
        : params.onlineStatus === "OFFLINE"
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
    if (params.orderBy) {
      query = query.orderBy(
        params.descend
          ? desc(mobileDeviceTable[params.orderBy])
          : mobileDeviceTable[params.orderBy]
      );
    } else {
      query = query.orderBy(desc(mobileDeviceTable.createTimeUtc));
    }
    const list = await query
      .limit(params.pageSize)
      .offset((params.pageNo - 1) * params.pageSize);
    return {
      list,
      total: count,
      totalPage: Math.ceil(count / params.pageSize),
      currentPage: params.pageNo,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    };
  }

  async insertEvent(
    data: Omit<DeviceEventRecord, "id" | "createTimeUtc">
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

  async listEvents(params: DeviceEventListParams): Promise<DeviceEventPage> {
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

  async getEventById(id: number): Promise<DeviceEventRecord | undefined> {
    const [row] = await db
      .select()
      .from(mobileDeviceEventTable)
      .where(eq(mobileDeviceEventTable.id, id));
    return row;
  }

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

  async deleteEventsBefore(cutoff: number): Promise<number> {
    const rows = await db
      .delete(mobileDeviceEventTable)
      .where(lt(mobileDeviceEventTable.createTimeUtc, cutoff))
      .returning({ id: mobileDeviceEventTable.id });
    return rows.length;
  }
}
