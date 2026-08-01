import { eq, like, and, desc, sql } from "drizzle-orm";
import db from "@hodor/core/db";
import {
  mobileDeviceTable,
  type MobileDeviceAddVOLike,
  type MobileDeviceUpdateVOLike,
  type MobileDevicePOLike,
} from "./model";

export class MobileDeviceRepository {
  async add(
    data: MobileDeviceAddVOLike & { creatorId: number }
  ): Promise<number> {
    const [result] = await db
      .insert(mobileDeviceTable)
      .values(data)
      .returning({ id: mobileDeviceTable.id });
    return result.id;
  }

  async update(
    data: MobileDeviceUpdateVOLike & { updaterId: number }
  ): Promise<void> {
    await db
      .update(mobileDeviceTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileDeviceTable.id, data.id));
  }

  async delete(id: number): Promise<void> {
    await db.delete(mobileDeviceTable).where(eq(mobileDeviceTable.id, id));
  }

  async getById(id: number): Promise<MobileDevicePOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.id, id));
    return result;
  }

  async getByClientId(
    clientId: string
  ): Promise<MobileDevicePOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.clientId, clientId));
    return result;
  }

  async list(params: {
    pageNo: number;
    pageSize: number;
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof MobileDevicePOLike;
    descend?: boolean;
  }) {
    const { pageNo, pageSize, keyword, isEnabled, orderBy, descend } = params;
    const conditions = [];

    if (keyword) {
      conditions.push(
        like(mobileDeviceTable.clientId, `%${keyword}%`),
        like(mobileDeviceTable.deviceName, `%${keyword}%`)
      );
    }
    const whereCondition = and(
      conditions.length > 0
        ? sql`(${conditions[0]} OR ${conditions[1]})`
        : undefined,
      isEnabled !== undefined
        ? eq(mobileDeviceTable.isEnabled, isEnabled)
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
}

export const mobileDeviceRepo = new MobileDeviceRepository();
