import db from "@hodor/core/db";
import { medicalRecordsTable, type MedicalRecordPOLike } from "./model.js";
import { eq, like, or, and, count, desc, asc, type SQL } from "drizzle-orm";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export const healthRepository = {
  async findPage(params: {
    keyword?: string;
    category?: string;
    creatorId?: number;
    orderBy?: keyof MedicalRecordPOLike;
    descend?: boolean;
    pageNo?: number;
    pageSize?: number;
  }) {
    const {
      keyword,
      category,
      creatorId,
      orderBy = "visitDateUtc",
      descend = true,
      pageNo = 1,
      pageSize = 10,
    } = params;

    const conditions: SQL[] = [];

    if (creatorId) {
      conditions.push(eq(medicalRecordsTable.creatorId, creatorId));
    }
    if (category) {
      conditions.push(eq(medicalRecordsTable.category, category));
    }
    if (keyword) {
      const pattern = `%${keyword}%`;
      conditions.push(
        or(
          like(medicalRecordsTable.title, pattern),
          like(medicalRecordsTable.hospitalName, pattern),
          like(medicalRecordsTable.doctorName, pattern),
          like(medicalRecordsTable.diagnosis, pattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(medicalRecordsTable)
      .where(whereClause);

    const total = totalRow?.total || 0;

    const getHealthOrder = () => {
      if (orderBy === "id")
        return descend
          ? desc(medicalRecordsTable.id)
          : asc(medicalRecordsTable.id);
      if (orderBy === "category")
        return descend
          ? desc(medicalRecordsTable.category)
          : asc(medicalRecordsTable.category);
      if (orderBy === "cost")
        return descend
          ? desc(medicalRecordsTable.cost)
          : asc(medicalRecordsTable.cost);
      if (orderBy === "createTimeUtc")
        return descend
          ? desc(medicalRecordsTable.createTimeUtc)
          : asc(medicalRecordsTable.createTimeUtc);
      return descend
        ? desc(medicalRecordsTable.visitDateUtc)
        : asc(medicalRecordsTable.visitDateUtc);
    };

    const list = await db
      .select()
      .from(medicalRecordsTable)
      .where(whereClause)
      .orderBy(getHealthOrder())
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize);

    return { total, list };
  },

  async findById(id: number) {
    const [row] = await db
      .select()
      .from(medicalRecordsTable)
      .where(eq(medicalRecordsTable.id, id));
    return row || null;
  },

  async insert(
    data: Omit<MedicalRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    const [result] = await db
      .insert(medicalRecordsTable)
      .values({
        ...data,
        createTimeUtc: getCurrentTimestampUtcSql(),
      })
      .returning({ id: medicalRecordsTable.id });
    return result;
  },

  async update(
    id: number,
    data: Partial<
      Omit<MedicalRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
    >
  ) {
    await db
      .update(medicalRecordsTable)
      .set({
        ...data,
        updateTimeUtc: getCurrentTimestampUtcSql(),
      })
      .where(eq(medicalRecordsTable.id, id));
    return true;
  },

  async delete(id: number) {
    await db.delete(medicalRecordsTable).where(eq(medicalRecordsTable.id, id));
    return true;
  },
};
