import { and, count, desc, eq, lte, sql } from "drizzle-orm";

import db from "@hodor/core/db";
import {
  mobileDeviceOpsAuditTable,
  mobileDeviceOpsSessionTable,
  type DeviceOpsSessionStatus,
  type MobileDeviceOpsAudit,
  type MobileDeviceOpsSession,
} from "./model.js";

/** D1 persistence for short-lived operations sessions and encrypted audits. */
export class DeviceOpsRepository {
  /** Expire active sessions whose deadlines have elapsed. */
  async expireSessions(now: number): Promise<void> {
    await db
      .update(mobileDeviceOpsSessionTable)
      .set({
        activeClientId: null,
        status: "EXPIRED",
        closedAtUtc: now,
        closeCode: "OPS_SESSION_EXPIRED",
        closeMessage: "Operations session expired",
        updateTimeUtc: now,
      })
      .where(
        and(
          lte(mobileDeviceOpsSessionTable.expiresAtUtc, now),
          sql`${mobileDeviceOpsSessionTable.activeClientId} is not null`
        )
      );
  }

  /** Create a session after clearing expired active rows. */
  async createSession(input: {
    sessionId: string;
    clientId: string;
    actorId: number;
    actorName: string;
    expiresAtUtc: number;
  }): Promise<MobileDeviceOpsSession> {
    await this.expireSessions(Date.now());
    const [row] = await db
      .insert(mobileDeviceOpsSessionTable)
      .values({
        ...input,
        activeClientId: input.clientId,
        status: "PENDING_DEVICE",
      })
      .returning();
    return row;
  }

  /** Get a session by public identifier. */
  async getSession(
    sessionId: string
  ): Promise<MobileDeviceOpsSession | undefined> {
    const [row] = await db
      .select()
      .from(mobileDeviceOpsSessionTable)
      .where(eq(mobileDeviceOpsSessionTable.sessionId, sessionId));
    return row;
  }

  /** List sessions for one device or all devices. */
  async listSessions(input: {
    clientId?: string;
    pageNo: number;
    pageSize: number;
  }): Promise<{ list: MobileDeviceOpsSession[]; total: number }> {
    const where = input.clientId
      ? eq(mobileDeviceOpsSessionTable.clientId, input.clientId)
      : undefined;
    const [totalRow] = await db
      .select({ value: count() })
      .from(mobileDeviceOpsSessionTable)
      .where(where);
    const list = await db
      .select()
      .from(mobileDeviceOpsSessionTable)
      .where(where)
      .orderBy(desc(mobileDeviceOpsSessionTable.createTimeUtc))
      .limit(input.pageSize)
      .offset((input.pageNo - 1) * input.pageSize);
    return { list, total: totalRow?.value || 0 };
  }

  /** Update session state from the Durable Object or MQTT lifecycle event. */
  async updateSession(
    sessionId: string,
    input: {
      status: DeviceOpsSessionStatus;
      code?: string | null;
      message?: string | null;
      connectedAtUtc?: number | null;
      lastActiveAtUtc?: number | null;
      terminal?: boolean;
    }
  ): Promise<void> {
    const now = Date.now();
    await db
      .update(mobileDeviceOpsSessionTable)
      .set({
        status: input.status,
        activeClientId: input.terminal ? null : undefined,
        connectedAtUtc: input.connectedAtUtc,
        lastActiveAtUtc: input.lastActiveAtUtc,
        closedAtUtc: input.terminal ? now : undefined,
        closeCode: input.code,
        closeMessage: input.message,
        updateTimeUtc: now,
      })
      .where(eq(mobileDeviceOpsSessionTable.sessionId, sessionId));
  }

  /** List non-sensitive audit indexes. */
  async listAudits(input: {
    clientId?: string;
    sessionId?: string;
    pageNo: number;
    pageSize: number;
  }): Promise<{ list: MobileDeviceOpsAudit[]; total: number }> {
    const where = input.sessionId
      ? eq(mobileDeviceOpsAuditTable.sessionId, input.sessionId)
      : input.clientId
        ? eq(mobileDeviceOpsAuditTable.clientId, input.clientId)
        : undefined;
    const [totalRow] = await db
      .select({ value: count() })
      .from(mobileDeviceOpsAuditTable)
      .where(where);
    const list = await db
      .select()
      .from(mobileDeviceOpsAuditTable)
      .where(where)
      .orderBy(desc(mobileDeviceOpsAuditTable.createTimeUtc))
      .limit(input.pageSize)
      .offset((input.pageNo - 1) * input.pageSize);
    return { list, total: totalRow?.value || 0 };
  }

  /** Get an encrypted audit row. */
  async getAudit(id: number): Promise<MobileDeviceOpsAudit | undefined> {
    const [row] = await db
      .select()
      .from(mobileDeviceOpsAuditTable)
      .where(eq(mobileDeviceOpsAuditTable.id, id));
    return row;
  }

  /** Delete encrypted operations audits after the retention period. */
  async cleanupAudits(before: number): Promise<void> {
    await db
      .delete(mobileDeviceOpsAuditTable)
      .where(lte(mobileDeviceOpsAuditTable.createTimeUtc, before));
  }
}

export const deviceOpsRepository = new DeviceOpsRepository();
