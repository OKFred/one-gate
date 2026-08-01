import { eq, like, and, desc, sql } from "drizzle-orm";
import db from "@hodor/core/db";
import {
  mobileDeviceAppTable,
  type MobileDeviceAppAddVOLike,
  type MobileDeviceAppUpdateVOLike,
  type MobileDeviceAppPOLike,
} from "./model";
import { mobileAppTable } from "../app/model";

export class MobileDeviceAppRepository {
  async add(
    data: MobileDeviceAppAddVOLike & { creatorId: number }
  ): Promise<number> {
    const [result] = await db
      .insert(mobileDeviceAppTable)
      .values(data)
      .returning({ id: mobileDeviceAppTable.id });
    return result.id;
  }

  async update(
    data: MobileDeviceAppUpdateVOLike & { updaterId: number }
  ): Promise<void> {
    await db
      .update(mobileDeviceAppTable)
      .set({
        ...data,
        updateTimeUtc: sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`,
      })
      .where(eq(mobileDeviceAppTable.id, data.id));
  }

  async upsert(
    data: MobileDeviceAppAddVOLike & { creatorId: number; updaterId: number }
  ): Promise<void> {
    const existing = await this.getByClientIdAndAppId(
      data.clientId,
      data.appId
    );
    if (existing) {
      await this.update({
        id: existing.id,
        installedVersionCode: data.installedVersionCode,
        installedVersionName: data.installedVersionName,
        installStatus: data.installStatus,
        lastSyncTimeUtc: data.lastSyncTimeUtc,
        updaterId: data.updaterId,
      });
    } else {
      await this.add(data);
    }
  }

  async delete(id: number): Promise<void> {
    await db
      .delete(mobileDeviceAppTable)
      .where(eq(mobileDeviceAppTable.id, id));
  }

  async getById(id: number): Promise<MobileDeviceAppPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceAppTable)
      .where(eq(mobileDeviceAppTable.id, id));
    return result;
  }

  async getByClientIdAndAppId(
    clientId: string,
    appId: number
  ): Promise<MobileDeviceAppPOLike | undefined> {
    const [result] = await db
      .select()
      .from(mobileDeviceAppTable)
      .where(
        and(
          eq(mobileDeviceAppTable.clientId, clientId),
          eq(mobileDeviceAppTable.appId, appId)
        )
      );
    return result;
  }

  async list(params: {
    pageNo: number;
    pageSize: number;
    clientId?: string;
    appId?: number;
    installStatus?: "INSTALLED" | "INSTALLING" | "FAILED" | "UNINSTALLED";
    orderBy?: keyof MobileDeviceAppPOLike;
    descend?: boolean;
  }) {
    const {
      pageNo,
      pageSize,
      clientId,
      appId,
      installStatus,
      orderBy,
      descend,
    } = params;
    const whereCondition = and(
      clientId ? eq(mobileDeviceAppTable.clientId, clientId) : undefined,
      appId ? eq(mobileDeviceAppTable.appId, appId) : undefined,
      installStatus
        ? eq(mobileDeviceAppTable.installStatus, installStatus)
        : undefined
    );

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileDeviceAppTable)
      .where(whereCondition);

    let query = db
      .select({
        mobileDeviceApp: mobileDeviceAppTable,
        mobileApp: mobileAppTable,
      })
      .from(mobileDeviceAppTable)
      .leftJoin(
        mobileAppTable,
        eq(mobileDeviceAppTable.appId, mobileAppTable.id)
      )
      .where(whereCondition)
      .$dynamic();

    if (orderBy) {
      query = query.orderBy(
        descend
          ? desc(mobileDeviceAppTable[orderBy])
          : mobileDeviceAppTable[orderBy]
      );
    } else {
      query = query.orderBy(desc(mobileDeviceAppTable.createTimeUtc));
    }

    const list = await query.limit(pageSize).offset((pageNo - 1) * pageSize);
    const mappedList = list.map((row) => ({
      ...row.mobileDeviceApp,
      appName: row.mobileApp?.name ?? "",
      appIconUrl: row.mobileApp?.iconUrl ?? null,
      appPackageName: row.mobileApp?.packageName ?? "",
    }));

    return {
      list: mappedList,
      total: count,
      totalPage: Math.ceil(count / pageSize),
      currentPage: pageNo,
      pageNo,
      pageSize,
    };
  }
}

export const mobileDeviceAppRepo = new MobileDeviceAppRepository();
