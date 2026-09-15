import db from "@hodor/core/db/index";
import {
  SOFT_DELETE_RETENTION_MS,
  SOFT_DELETE_BATCH_SIZE,
} from "@hodor/core/db/soft-delete";
import {
  departmentTable,
  type DepartmentPOLike,
  type DepartmentRecord,
} from "./model";
import {
  asc,
  count,
  desc,
  eq,
  like,
  and,
  sql,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import {
  activeDepartmentReference,
  departmentHasNoReferences,
} from "./reference-guards";
import {
  DepartmentDeletionError,
  rethrowDepartmentNameConflict,
} from "./errors";

const publicColumns = {
  id: departmentTable.id,
  name: departmentTable.name,
  parentId: departmentTable.parentId,
  remark: departmentTable.remark,
  isEnabled: departmentTable.isEnabled,
  creatorId: departmentTable.creatorId,
  updaterId: departmentTable.updaterId,
  createTimeUtc: departmentTable.createTimeUtc,
  updateTimeUtc: departmentTable.updateTimeUtc,
};

type DepartmentInsert = Omit<
  InferInsertModel<typeof departmentTable>,
  "id" | "createTimeUtc" | "updateTimeUtc"
>;

export const buildWhereCondition = (condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) => {
  const conditions: SQL[] = [eq(departmentTable.isDeleted, false)];
  if (condition?.keyword)
    conditions.push(like(departmentTable.name, `%${condition.keyword}%`));
  if (condition?.isEnabled !== undefined)
    conditions.push(eq(departmentTable.isEnabled, condition.isEnabled));
  return and(...conditions);
};

/** Recursive UNION also terminates safely when inspecting malformed legacy trees. */
function validParentForUpdate(id: number, parentId: number | null): SQL {
  return sql`${activeDepartmentReference(parentId)} AND NOT EXISTS (
    WITH RECURSIVE descendants(id) AS (
      SELECT ${id} UNION SELECT child.id FROM system_department AS child JOIN descendants ON child.parent_id = descendants.id
    ) SELECT 1 FROM descendants WHERE id = ${parentId}
  )`;
}

export class DepartmentRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof DepartmentPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    const { orderBy = "id", descend = true, pageNo, pageSize } = params;
    const orderField = publicColumns[orderBy] || departmentTable.id;
    const where = buildWhereCondition(params);
    const totals = await db
      .select({ total: count() })
      .from(departmentTable)
      .where(where);
    const total = totals[0]?.total ?? 0;
    const list =
      total === 0
        ? []
        : await db
            .select(publicColumns)
            .from(departmentTable)
            .where(where)
            .orderBy(descend ? desc(orderField) : asc(orderField))
            .limit(pageSize)
            .offset((pageNo - 1) * pageSize);
    return { total, list };
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    orderBy?: keyof DepartmentPOLike;
    descend?: boolean;
  }) {
    const { orderBy = "id", descend = true } = params;
    const orderField = publicColumns[orderBy] || departmentTable.id;
    return db
      .select({
        id: departmentTable.id,
        name: departmentTable.name,
        parentId: departmentTable.parentId,
        remark: departmentTable.remark,
        isEnabled: departmentTable.isEnabled,
      })
      .from(departmentTable)
      .where(buildWhereCondition(params))
      .orderBy(descend ? desc(orderField) : asc(orderField))
      .limit(10000);
  }

  async findById(id: number): Promise<DepartmentPOLike | null> {
    const rows = await db
      .select(publicColumns)
      .from(departmentTable)
      .where(
        and(eq(departmentTable.id, id), eq(departmentTable.isDeleted, false))
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findDeletedById(id: number): Promise<DepartmentRecord | null> {
    const rows = await db
      .select()
      .from(departmentTable)
      .where(
        and(eq(departmentTable.id, id), eq(departmentTable.isDeleted, true))
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getDepartmentNameById(id: number): Promise<string | null> {
    const rows = await db
      .select({ name: departmentTable.name })
      .from(departmentTable)
      .where(
        and(eq(departmentTable.id, id), eq(departmentTable.isDeleted, false))
      )
      .limit(1);
    return rows[0]?.name ?? null;
  }

  async getAllDepartments(
    isEnabled?: boolean
  ): Promise<{ name: string; id: number; parentId: number }[]> {
    const rows = await db
      .select({
        name: departmentTable.name,
        id: departmentTable.id,
        parentId: departmentTable.parentId,
      })
      .from(departmentTable)
      .where(buildWhereCondition({ isEnabled }));
    return rows.map((row) => ({ ...row, parentId: row.parentId ?? 0 }));
  }

  async getTreeData(): Promise<DepartmentPOLike[]> {
    return db
      .select(publicColumns)
      .from(departmentTable)
      .where(eq(departmentTable.isDeleted, false))
      .orderBy(asc(departmentTable.id));
  }

  async onInsert(data: DepartmentInsert): Promise<number> {
    try {
      const rows = await db.all<{
        id: number;
      }>(sql`INSERT INTO system_department
        (name, parent_id, remark, is_enabled, creator_id, updater_id, create_time_utc, is_deleted, deleted_time_utc, deleter_id)
        SELECT ${data.name}, ${data.parentId ?? null}, ${data.remark ?? null}, ${data.isEnabled ? 1 : 0}, ${data.creatorId}, ${data.updaterId ?? null}, ${Date.now()}, 0, NULL, NULL
        WHERE ${activeDepartmentReference(data.parentId ?? null)} RETURNING id`);
      if (!rows[0])
        throw new BusinessError(DepartmentDeletionError.INVALID_PARENT);
      return rows[0].id;
    } catch (error) {
      rethrowDepartmentNameConflict(error);
    }
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<DepartmentInsert, "isDeleted" | "deletedTimeUtc" | "deleterId">
    >
  ): Promise<number> {
    try {
      const rows = await db
        .update(departmentTable)
        .set({
          ...data,
          updateTimeUtc: sql<number>`MAX(${Date.now()}, COALESCE(${departmentTable.updateTimeUtc}, 0))`,
        })
        .where(
          and(
            eq(departmentTable.id, id),
            eq(departmentTable.isDeleted, false),
            data.parentId !== undefined
              ? validParentForUpdate(id, data.parentId)
              : undefined
          )
        )
        .returning({ id: departmentTable.id });
      if (!rows[0])
        throw new BusinessError(DepartmentDeletionError.STATE_CONFLICT);
      return rows[0].id;
    } catch (error) {
      rethrowDepartmentNameConflict(error);
    }
  }

  async onDelete(
    id: number,
    actorId: number,
    now = Date.now()
  ): Promise<number> {
    // A restore followed by a delete in the same millisecond must get a new version.
    const deletedTime = sql<number>`MAX(${now}, COALESCE(${departmentTable.updateTimeUtc}, 0) + 1)`;
    const rows = await db
      .update(departmentTable)
      .set({
        isDeleted: true,
        deletedTimeUtc: deletedTime,
        deleterId: actorId,
        updaterId: actorId,
        updateTimeUtc: deletedTime,
      })
      .where(
        and(
          eq(departmentTable.id, id),
          eq(departmentTable.isDeleted, false),
          sql`COALESCE(${departmentTable.updateTimeUtc}, 0) <= ${now}`,
          departmentHasNoReferences(sql`${departmentTable.id}`, false)
        )
      )
      .returning({ id: departmentTable.id });
    if (!rows[0]) {
      const row = await this.findById(id);
      if (!row) throw new BusinessError(DepartmentDeletionError.NOT_ACTIVE);
      if (row.updateTimeUtc !== null && row.updateTimeUtc > now)
        throw new BusinessError(DepartmentDeletionError.CLOCK_CONFLICT);
      throw new BusinessError(DepartmentDeletionError.HAS_REFERENCES);
    }
    return rows[0].id;
  }

  async listDeleted(params: {
    keyword?: string;
    pageNo: number;
    pageSize: number;
    now?: number;
  }) {
    const now = params.now ?? Date.now();
    const where = and(
      eq(departmentTable.isDeleted, true),
      params.keyword
        ? sql`instr(${departmentTable.name}, ${params.keyword}) > 0`
        : undefined
    );
    const totals = await db
      .select({ total: count() })
      .from(departmentTable)
      .where(where);
    const rows = await db
      .select({
        id: departmentTable.id,
        name: departmentTable.name,
        deleterId: sql<number>`${departmentTable.deleterId}`,
        deleterName: sql<
          string | null
        >`(SELECT username FROM system_user WHERE id = ${departmentTable.deleterId})`,
        deletedTimeUtc: sql<number>`${departmentTable.deletedTimeUtc}`,
      })
      .from(departmentTable)
      .where(where)
      .orderBy(desc(departmentTable.deletedTimeUtc), desc(departmentTable.id))
      .limit(params.pageSize)
      .offset((params.pageNo - 1) * params.pageSize);
    return {
      total: totals[0]?.total ?? 0,
      list: rows.map((row) => ({
        ...row,
        expiresTimeUtc: row.deletedTimeUtc + SOFT_DELETE_RETENTION_MS,
        canRestore: row.deletedTimeUtc + SOFT_DELETE_RETENTION_MS > now,
      })),
    };
  }

  async restore(
    id: number,
    expectedDeletedTimeUtc: number,
    actorId: number,
    now: number
  ): Promise<number | null> {
    try {
      const rows = await db
        .update(departmentTable)
        .set({
          isDeleted: false,
          deletedTimeUtc: null,
          deleterId: null,
          updaterId: actorId,
          updateTimeUtc: Math.max(now, expectedDeletedTimeUtc),
        })
        .where(
          and(
            eq(departmentTable.id, id),
            eq(departmentTable.isDeleted, true),
            eq(departmentTable.deletedTimeUtc, expectedDeletedTimeUtc),
            sql`${departmentTable.deletedTimeUtc} > ${now - SOFT_DELETE_RETENTION_MS}`,
            sql`(${departmentTable.parentId} IS NULL OR EXISTS (SELECT 1 FROM system_department AS parent WHERE parent.id = ${departmentTable.parentId} AND parent.is_deleted = 0))`
          )
        )
        .returning({ id: departmentTable.id });
      return rows[0]?.id ?? null;
    } catch (error) {
      rethrowDepartmentNameConflict(error);
    }
  }

  async purge(
    id: number,
    expectedDeletedTimeUtc: number
  ): Promise<number | null> {
    const rows = await db
      .delete(departmentTable)
      .where(
        and(
          eq(departmentTable.id, id),
          eq(departmentTable.isDeleted, true),
          eq(departmentTable.deletedTimeUtc, expectedDeletedTimeUtc),
          departmentHasNoReferences(sql`${departmentTable.id}`, true)
        )
      )
      .returning({ id: departmentTable.id });
    return rows[0]?.id ?? null;
  }
}

export const departmentRepository = new DepartmentRepository();

export async function purgeExpiredDepartments({
  now,
  batchSize,
}: {
  now: number;
  batchSize: number;
}): Promise<{
  deletedCount: number;
  remainingExpired: number;
  oldestExpiredTimeUtc: number | null;
}> {
  const cutoff = now - SOFT_DELETE_RETENTION_MS;
  const limit = Math.max(
    1,
    Math.min(SOFT_DELETE_BATCH_SIZE, Math.floor(batchSize))
  );
  const deleted = await db.all<{
    id: number;
  }>(sql`DELETE FROM system_department WHERE id IN (
    SELECT candidate.id FROM system_department AS candidate
    WHERE candidate.is_deleted = 1 AND candidate.deleted_time_utc <= ${cutoff}
      AND ${departmentHasNoReferences(sql`candidate.id`, true)}
    ORDER BY candidate.deleted_time_utc, candidate.id LIMIT ${limit}
  ) AND is_deleted = 1 AND deleted_time_utc <= ${cutoff}
    AND ${departmentHasNoReferences(sql`system_department.id`, true)} RETURNING id`);
  const remaining = await db
    .select({
      remainingExpired: count(),
      oldestExpiredTimeUtc: sql<
        number | null
      >`MIN(${departmentTable.deletedTimeUtc}) + ${SOFT_DELETE_RETENTION_MS}`,
    })
    .from(departmentTable)
    .where(
      and(
        eq(departmentTable.isDeleted, true),
        sql`${departmentTable.deletedTimeUtc} <= ${cutoff}`
      )
    );
  return {
    deletedCount: deleted.length,
    remainingExpired: remaining[0]?.remainingExpired ?? 0,
    oldestExpiredTimeUtc: remaining[0]?.oldestExpiredTimeUtc ?? null,
  };
}
