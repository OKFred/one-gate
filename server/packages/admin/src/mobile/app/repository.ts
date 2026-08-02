import { eq, like, and, desc, sql } from "drizzle-orm";
import db from "@hodor/core/db";
import {
  mobileAppTable,
  type MobileAppAddVOLike,
  type MobileAppUpdateVOLike,
  type MobileAppPOLike,
} from "./model";

export class MobileAppRepository {
  async add(data: MobileAppAddVOLike & { creatorId: number }): Promise<number> {
    const [result] = await db
      .insert(mobileAppTable)
      .values(data)
      .returning({ id: mobileAppTable.id });
    return result.id;
  }

  async update(
    data: MobileAppUpdateVOLike & { updaterId: number }
  ): Promise<void> {
    await db
      .update(mobileAppTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileAppTable.id, data.id));
  }

  async delete(id: number): Promise<void> {
    await db.delete(mobileAppTable).where(eq(mobileAppTable.id, id));
  }

  async getById(id: number): Promise<MobileAppPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAppTable)
      .where(eq(mobileAppTable.id, id));
    return result;
  }

  async getByPackageName(
    packageName: string
  ): Promise<MobileAppPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileAppTable)
      .where(eq(mobileAppTable.packageName, packageName));
    return result;
  }

  async list(params: {
    pageNo: number;
    pageSize: number;
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof MobileAppPOLike;
    descend?: boolean;
  }) {
    const { pageNo, pageSize, keyword, isEnabled, orderBy, descend } = params;
    const conditions = [];

    if (keyword) {
      conditions.push(
        like(mobileAppTable.packageName, `%${keyword}%`),
        like(mobileAppTable.name, `%${keyword}%`)
      );
    }
    const whereCondition = and(
      conditions.length > 0
        ? sql`(${conditions[0]} OR ${conditions[1]})`
        : undefined,
      isEnabled !== undefined
        ? eq(mobileAppTable.isEnabled, isEnabled)
        : undefined
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileAppTable)
      .where(whereCondition);

    let query = db
      .select()
      .from(mobileAppTable)
      .where(whereCondition)
      .$dynamic();

    if (orderBy) {
      query = query.orderBy(
        descend ? desc(mobileAppTable[orderBy]) : mobileAppTable[orderBy]
      );
    } else {
      query = query.orderBy(desc(mobileAppTable.createTimeUtc));
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

export const mobileAppRepo = new MobileAppRepository();
