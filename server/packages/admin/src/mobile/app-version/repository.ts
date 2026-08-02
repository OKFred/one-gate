import { eq, like, and, desc, sql } from "drizzle-orm";
import db from "@hodor/core/db";
import {
  mobileAppVersionTable,
  type MobileAppVersionAddVOLike,
  type MobileAppVersionUpdateVOLike,
  type MobileAppVersionPOLike,
} from "./model";

export class MobileAppVersionRepository {
  async add(
    data: MobileAppVersionAddVOLike & { creatorId: number }
  ): Promise<number> {
    const [result] = await db
      .insert(mobileAppVersionTable)
      .values(data)
      .returning({ id: mobileAppVersionTable.id });
    return result.id;
  }

  async update(
    data: MobileAppVersionUpdateVOLike & { updaterId: number }
  ): Promise<void> {
    await db
      .update(mobileAppVersionTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileAppVersionTable.id, data.id));
  }

  async delete(id: number): Promise<void> {
    await db
      .delete(mobileAppVersionTable)
      .where(eq(mobileAppVersionTable.id, id));
  }

  async getById(id: number): Promise<MobileAppVersionPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAppVersionTable)
      .where(eq(mobileAppVersionTable.id, id));
    return result;
  }

  async getByAppIdAndVersionCode(
    appId: number,
    versionCode: number
  ): Promise<MobileAppVersionPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAppVersionTable)
      .where(
        and(
          eq(mobileAppVersionTable.appId, appId),
          eq(mobileAppVersionTable.versionCode, versionCode)
        )
      );
    return result;
  }

  async list(params: {
    pageNo: number;
    pageSize: number;
    appId?: number;
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof MobileAppVersionPOLike;
    descend?: boolean;
  }) {
    const { pageNo, pageSize, appId, keyword, isEnabled, orderBy, descend } =
      params;
    const conditions = [];

    if (keyword) {
      conditions.push(like(mobileAppVersionTable.versionName, `%${keyword}%`));
    }
    const whereCondition = and(
      conditions.length > 0 ? sql`(${conditions[0]})` : undefined,
      isEnabled !== undefined
        ? eq(mobileAppVersionTable.isEnabled, isEnabled)
        : undefined,
      appId !== undefined ? eq(mobileAppVersionTable.appId, appId) : undefined
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileAppVersionTable)
      .where(whereCondition);

    let query = db
      .select()
      .from(mobileAppVersionTable)
      .where(whereCondition)
      .$dynamic();

    if (orderBy) {
      query = query.orderBy(
        descend
          ? desc(mobileAppVersionTable[orderBy])
          : mobileAppVersionTable[orderBy]
      );
    } else {
      query = query.orderBy(desc(mobileAppVersionTable.versionCode));
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

export const mobileAppVersionRepo = new MobileAppVersionRepository();
