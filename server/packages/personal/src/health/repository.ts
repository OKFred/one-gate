import db from "@hodor/core/db";
import { medicalRecordsTable, type MedicalRecordPOLike } from "./model.js";
import { eq, like, or, and, count, desc, asc, type SQL } from "drizzle-orm";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";

function owned(creatorId: number) {
  if (!Number.isSafeInteger(creatorId) || creatorId <= 0)
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return eq(medicalRecordsTable.creatorId, creatorId);
}

type EditableFields = Pick<
  MedicalRecordPOLike,
  | "category"
  | "title"
  | "hospitalName"
  | "doctorName"
  | "visitDateUtc"
  | "diagnosis"
  | "prescription"
  | "reportUrl"
  | "cost"
  | "remark"
>;

export const healthRepository = {
  async findPage(params: {
    keyword?: string;
    category?: string;
    creatorId: number;
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

    const conditions: SQL[] = [owned(creatorId)];
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

    const whereClause = and(...conditions);

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

  async findById(creatorId: number, id: number) {
    const [row] = await db
      .select()
      .from(medicalRecordsTable)
      .where(and(owned(creatorId), eq(medicalRecordsTable.id, id)));
    return row || null;
  },

  async insert(
    data: Omit<MedicalRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    owned(data.creatorId);
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
    creatorId: number,
    id: number,
    data: Partial<EditableFields> &
      Pick<MedicalRecordPOLike, "updaterId" | "updaterName">
  ) {
    const [row] = await db
      .update(medicalRecordsTable)
      .set({
        ...data,
        updateTimeUtc: getCurrentTimestampUtcSql(),
      })
      .where(and(owned(creatorId), eq(medicalRecordsTable.id, id)))
      .returning({ id: medicalRecordsTable.id });
    return row?.id ?? null;
  },

  async delete(creatorId: number, id: number) {
    const [row] = await db
      .delete(medicalRecordsTable)
      .where(and(owned(creatorId), eq(medicalRecordsTable.id, id)))
      .returning({ id: medicalRecordsTable.id });
    return row?.id ?? null;
  },
};
