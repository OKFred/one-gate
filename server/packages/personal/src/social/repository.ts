import db from "@hodor/core/db";
import {
  socialContactsTable,
  socialRelationsTable,
  type SocialContactPOLike,
  type SocialRelationPOLike,
} from "./model.js";
import { eq, like, or, and, count, desc, asc, type SQL } from "drizzle-orm";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export const socialRepository = {
  // Contacts
  async findContactPage(params: {
    keyword?: string;
    relationCircle?: string;
    creatorId?: number;
    pageNo?: number;
    pageSize?: number;
  }) {
    const {
      keyword,
      relationCircle,
      creatorId,
      pageNo = 1,
      pageSize = 10,
    } = params;
    const conditions: SQL[] = [];

    if (creatorId)
      conditions.push(eq(socialContactsTable.creatorId, creatorId));
    if (relationCircle)
      conditions.push(eq(socialContactsTable.relationCircle, relationCircle));
    if (keyword) {
      const pattern = `%${keyword}%`;
      conditions.push(
        or(
          like(socialContactsTable.realName, pattern),
          like(socialContactsTable.company, pattern),
          like(socialContactsTable.position, pattern),
          like(socialContactsTable.phone, pattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalRow] = await db
      .select({ total: count() })
      .from(socialContactsTable)
      .where(whereClause);
    const total = totalRow?.total || 0;

    const list = await db
      .select()
      .from(socialContactsTable)
      .where(whereClause)
      .orderBy(
        desc(socialContactsTable.intimacyLevel),
        asc(socialContactsTable.id)
      )
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize);

    return { total, list };
  },

  async insertContact(
    data: Omit<SocialContactPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    const [res] = await db
      .insert(socialContactsTable)
      .values({ ...data, createTimeUtc: getCurrentTimestampUtcSql() })
      .returning({ id: socialContactsTable.id });
    return res;
  },

  async updateContact(
    id: number,
    data: Partial<
      Omit<SocialContactPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
    >
  ) {
    await db
      .update(socialContactsTable)
      .set({ ...data, updateTimeUtc: getCurrentTimestampUtcSql() })
      .where(eq(socialContactsTable.id, id));
    return true;
  },

  async deleteContact(id: number) {
    await db.delete(socialContactsTable).where(eq(socialContactsTable.id, id));
    await db
      .delete(socialRelationsTable)
      .where(
        or(
          eq(socialRelationsTable.sourceContactId, id),
          eq(socialRelationsTable.targetContactId, id)
        )
      );
    return true;
  },

  // Relations Topology
  async getGraphData(creatorId: number) {
    const contacts = await db
      .select()
      .from(socialContactsTable)
      .where(eq(socialContactsTable.creatorId, creatorId));

    const relations = await db
      .select()
      .from(socialRelationsTable)
      .where(eq(socialRelationsTable.creatorId, creatorId));

    return { contacts, relations };
  },

  async insertRelation(
    data: Omit<SocialRelationPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    const [res] = await db
      .insert(socialRelationsTable)
      .values({ ...data, createTimeUtc: getCurrentTimestampUtcSql() })
      .returning({ id: socialRelationsTable.id });
    return res;
  },
};
