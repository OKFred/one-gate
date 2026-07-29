import db from "@hodor/core/db";
import { familyMembersTable, type FamilyMemberPOLike } from "./model.js";
import { eq, like, or, and, count, desc, asc, type SQL } from "drizzle-orm";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export const familyRepository = {
  async findPage(params: {
    keyword?: string;
    relationType?: string;
    creatorId?: number;
    pageNo?: number;
    pageSize?: number;
  }) {
    const {
      keyword,
      relationType,
      creatorId,
      pageNo = 1,
      pageSize = 10,
    } = params;
    const conditions: SQL[] = [];

    if (creatorId) conditions.push(eq(familyMembersTable.creatorId, creatorId));
    if (relationType)
      conditions.push(eq(familyMembersTable.relationType, relationType));
    if (keyword) {
      const pattern = `%${keyword}%`;
      conditions.push(
        or(
          like(familyMembersTable.realName, pattern),
          like(familyMembersTable.phone, pattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(familyMembersTable)
      .where(whereClause);
    const total = totalRow?.total || 0;

    const list = await db
      .select()
      .from(familyMembersTable)
      .where(whereClause)
      .orderBy(desc(familyMembersTable.isSelf), asc(familyMembersTable.id))
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize);

    return { total, list };
  },

  async insert(
    data: Omit<FamilyMemberPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    const [res] = await db
      .insert(familyMembersTable)
      .values({ ...data, createTimeUtc: getCurrentTimestampUtcSql() })
      .returning({ id: familyMembersTable.id });
    return res;
  },

  async update(
    id: number,
    data: Partial<
      Omit<FamilyMemberPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
    >
  ) {
    await db
      .update(familyMembersTable)
      .set({ ...data, updateTimeUtc: getCurrentTimestampUtcSql() })
      .where(eq(familyMembersTable.id, id));
    return true;
  },

  async delete(id: number) {
    await db.delete(familyMembersTable).where(eq(familyMembersTable.id, id));
    return true;
  },
};
