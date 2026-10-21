import db from "@hodor/core/db/index";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import {
  and,
  asc,
  count,
  desc,
  eq,
  like,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { tenantGuard, type TenantContext } from "../tenant/context";
import {
  assetTable,
  assetIdentifierTable,
  assetAssignmentTable,
  assetMeasurementBindingTable,
  type AssetListInput,
  type AssetAddInput,
  type AssetUpdateInput,
  type AssetStateInput,
  type IdentifierAddInput,
  type IdentifierUpdateInput,
  type ChildListInput,
  type AssignInput,
  type BindInput,
  type CloseRelationInput,
  type MappingResolveInput,
  type MappingListInput,
} from "./model";
import { AssetError, guardedAssetWrite } from "./errors";

function human(ctx: TenantContext): number {
  if (ctx.principal.kind !== "user")
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return ctx.principal.userId;
}
function readGuard(ctx: TenantContext): SQL {
  human(ctx);
  return tenantGuard(ctx);
}
function writeGuard(ctx: TenantContext): SQL {
  human(ctx);
  if (ctx.capability === "read")
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return tenantGuard(ctx);
}

/** A zero-row CAS must abort the transaction before any following mutation can commit. */
function assertChanged() {
  return db
    .select({
      accepted: sql<string>`json(CASE WHEN changes() = 1 THEN '{}' ELSE 'asset_write_conflict' END)`,
    })
    .from(sql`(SELECT 1) AS asset_write_assertion`);
}
const publicAssetColumns = {
  id: assetTable.id,
  tenantId: assetTable.tenantId,
  assetId: assetTable.assetId,
  assetCode: assetTable.assetCode,
  name: assetTable.name,
  category: assetTable.category,
  brand: assetTable.brand,
  model: assetTable.model,
  remark: assetTable.remark,
  status: assetTable.status,
  retiredTimeUtc: assetTable.retiredTimeUtc,
  stateReason: assetTable.stateReason,
  creatorId: assetTable.creatorId,
  updaterId: assetTable.updaterId,
  createTimeUtc: assetTable.createTimeUtc,
  updateTimeUtc: assetTable.updateTimeUtc,
};
function pages<T>(list: T[], total: number, pageNo: number, pageSize: number) {
  return {
    list,
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
  };
}
function pagination(input: { pageNo?: number; pageSize?: number }) {
  return {
    pageNo: input.pageNo ?? 1,
    pageSize: Math.min(input.pageSize ?? 20, 100),
  };
}
function expectedVersion(field: SQLWrapper, expected: number | null): SQL {
  return sql`${field} IS ${expected}`;
}
function ownerActive(ctx: TenantContext, assetId: number): SQL {
  return sql`EXISTS (SELECT 1 FROM enterprise_asset AS owner
    WHERE owner.tenant_id = ${ctx.tenantId} AND owner.id = ${assetId} AND owner.status = 'active')`;
}
function overlaps(
  start: number,
  end: number | null,
  otherStart: SQL,
  otherEnd: SQL
): SQL {
  return sql`(${otherEnd} IS NULL OR ${start} < ${otherEnd})
    AND (${end} IS NULL OR ${otherStart} < ${end})`;
}
function intervalValid(start: number, end: number | null): SQL {
  return sql`${start} >= 0 AND ${start} <= ${getCurrentTimestampUtcSql()}
    AND (${end} IS NULL OR (${end} > ${start} AND ${end} <= ${getCurrentTimestampUtcSql()}))`;
}

export class AssetRepository {
  private assetCas(ctx: TenantContext, id: number, expected: number | null) {
    return db
      .update(assetTable)
      .set({
        updaterId: human(ctx),
        updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetTable.updateTimeUtc}, 0) + 1)`,
      })
      .where(
        and(
          eq(assetTable.tenantId, ctx.tenantId),
          eq(assetTable.id, id),
          eq(assetTable.status, "active"),
          expectedVersion(assetTable.updateTimeUtc, expected),
          writeGuard(ctx)
        )
      )
      .returning({ id: assetTable.id });
  }

  async findPage(ctx: TenantContext, input: AssetListInput) {
    const { pageNo, pageSize } = pagination(input);
    const where = and(
      eq(assetTable.tenantId, ctx.tenantId),
      readGuard(ctx),
      input.keyword
        ? or(
            like(assetTable.name, `%${input.keyword}%`),
            like(assetTable.assetCode, `%${input.keyword}%`)
          )
        : undefined,
      input.category ? eq(assetTable.category, input.category) : undefined,
      input.status ? eq(assetTable.status, input.status) : undefined
    );
    const total =
      (await db.select({ total: count() }).from(assetTable).where(where))[0]
        ?.total ?? 0;
    const sort = publicAssetColumns[input.orderBy ?? "id"];
    const list = await db
      .select(publicAssetColumns)
      .from(assetTable)
      .where(where)
      .orderBy(input.descend === false ? asc(sort) : desc(sort))
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    return pages(list, total, pageNo, pageSize);
  }

  async findById(ctx: TenantContext, id: number) {
    return (
      (
        await db
          .select(publicAssetColumns)
          .from(assetTable)
          .where(
            and(
              eq(assetTable.tenantId, ctx.tenantId),
              eq(assetTable.id, id),
              readGuard(ctx)
            )
          )
          .limit(1)
      )[0] ?? null
    );
  }

  async add(ctx: TenantContext, input: AssetAddInput) {
    const id = crypto.randomUUID();
    const [result] = await guardedAssetWrite(() =>
      db.batch([
        db
          .insert(assetTable)
          .select(
            sql`SELECT NULL, ${ctx.tenantId}, ${id}, ${input.assetCode?.trim() || null},
        ${input.name.trim()}, ${input.category}, ${input.brand?.trim() || null}, ${input.model?.trim() || null},
        ${input.remark?.trim() || null}, 'active', NULL, NULL, ${human(ctx)}, NULL, ${getCurrentTimestampUtcSql()}, NULL
        WHERE ${writeGuard(ctx)}`
          )
          .returning({ id: assetTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async update(ctx: TenantContext, input: AssetUpdateInput) {
    const [result] = await guardedAssetWrite(() =>
      db.batch([
        db
          .update(assetTable)
          .set({
            name: input.name.trim(),
            category: input.category,
            assetCode: input.assetCode?.trim() || null,
            brand: input.brand?.trim() || null,
            model: input.model?.trim() || null,
            remark: input.remark?.trim() || null,
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetTable.tenantId, ctx.tenantId),
              eq(assetTable.id, input.id),
              eq(assetTable.status, "active"),
              expectedVersion(
                assetTable.updateTimeUtc,
                input.expectedUpdateTimeUtc
              ),
              writeGuard(ctx),
              sql`(${input.category} = 'host' OR NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS child
          WHERE child.tenant_id = ${ctx.tenantId} AND child.host_asset_id = ${input.id} AND child.valid_to_utc IS NULL))`
            )
          )
          .returning({ id: assetTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async retire(ctx: TenantContext, input: AssetStateInput) {
    const actor = human(ctx);
    const [result] = await guardedAssetWrite(() =>
      db.batch([
        db
          .update(assetTable)
          .set({
            status: "retired",
            retiredTimeUtc: getCurrentTimestampUtcSql(),
            stateReason: input.reason.trim(),
            updaterId: actor,
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetTable.tenantId, ctx.tenantId),
              eq(assetTable.id, input.id),
              eq(assetTable.status, "active"),
              expectedVersion(
                assetTable.updateTimeUtc,
                input.expectedUpdateTimeUtc
              ),
              writeGuard(ctx),
              sql`NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS child
          WHERE child.tenant_id = ${ctx.tenantId} AND child.host_asset_id = ${input.id} AND child.valid_to_utc IS NULL)`,
              sql`NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS history WHERE history.tenant_id = ${ctx.tenantId}
          AND history.asset_id = ${input.id} AND history.valid_to_utc IS NULL AND history.valid_from_utc >= ${getCurrentTimestampUtcSql()})`,
              sql`NOT EXISTS (SELECT 1 FROM enterprise_asset_measurement_binding AS history WHERE history.tenant_id = ${ctx.tenantId}
          AND history.asset_id = ${input.id} AND history.valid_to_utc IS NULL AND history.valid_from_utc >= ${getCurrentTimestampUtcSql()})`
            )
          )
          .returning({ id: assetTable.id }),
        assertChanged(),
        db
          .update(assetAssignmentTable)
          .set({
            validToUtc: sql`(SELECT retired_time_utc FROM enterprise_asset WHERE tenant_id = ${ctx.tenantId} AND id = ${input.id})`,
            closeReason: input.reason.trim(),
            updaterId: actor,
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetAssignmentTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetAssignmentTable.tenantId, ctx.tenantId),
              eq(assetAssignmentTable.assetId, input.id),
              sql`${assetAssignmentTable.validToUtc} IS NULL`
            )
          ),
        db
          .update(assetMeasurementBindingTable)
          .set({
            validToUtc: sql`(SELECT retired_time_utc FROM enterprise_asset WHERE tenant_id = ${ctx.tenantId} AND id = ${input.id})`,
            closeReason: input.reason.trim(),
            updaterId: actor,
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetMeasurementBindingTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
              eq(assetMeasurementBindingTable.assetId, input.id),
              sql`${assetMeasurementBindingTable.validToUtc} IS NULL`
            )
          ),
      ])
    );
    return result[0].id;
  }

  async activate(ctx: TenantContext, input: AssetStateInput) {
    const [result] = await guardedAssetWrite(() =>
      db.batch([
        db
          .update(assetTable)
          .set({
            status: "active",
            retiredTimeUtc: null,
            stateReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetTable.tenantId, ctx.tenantId),
              eq(assetTable.id, input.id),
              eq(assetTable.status, "retired"),
              expectedVersion(
                assetTable.updateTimeUtc,
                input.expectedUpdateTimeUtc
              ),
              writeGuard(ctx)
            )
          )
          .returning({ id: assetTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async identifiers(ctx: TenantContext, input: ChildListInput) {
    const { pageNo, pageSize } = pagination(input);
    const where = and(
      eq(assetIdentifierTable.tenantId, ctx.tenantId),
      eq(assetIdentifierTable.assetId, input.assetId),
      readGuard(ctx)
    );
    const total =
      (
        await db
          .select({ total: count() })
          .from(assetIdentifierTable)
          .where(where)
      )[0]?.total ?? 0;
    const list = await db
      .select()
      .from(assetIdentifierTable)
      .where(where)
      .orderBy(
        input.descend === false
          ? asc(assetIdentifierTable.id)
          : desc(assetIdentifierTable.id)
      )
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    return pages(list, total, pageNo, pageSize);
  }

  async addIdentifier(
    ctx: TenantContext,
    input: IdentifierAddInput,
    normalizedValue: string
  ) {
    const [, , result] = await guardedAssetWrite(() =>
      db.batch([
        this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
        assertChanged(),
        db
          .insert(assetIdentifierTable)
          .select(
            sql`SELECT NULL, ${ctx.tenantId}, ${input.assetId}, ${input.identifierType},
        ${input.namespace.trim()}, ${input.value.trim()}, ${normalizedValue}, ${input.source.trim()}, ${input.confidence},
        ${input.isVerified ? 1 : 0}, ${human(ctx)}, NULL, ${getCurrentTimestampUtcSql()}, NULL
        WHERE ${writeGuard(ctx)} AND ${ownerActive(ctx, input.assetId)}`
          )
          .returning({ id: assetIdentifierTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async updateIdentifier(
    ctx: TenantContext,
    input: IdentifierUpdateInput,
    normalizedValue: string
  ) {
    const [, , result] = await guardedAssetWrite(() =>
      db.batch([
        this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
        assertChanged(),
        db
          .update(assetIdentifierTable)
          .set({
            identifierType: input.identifierType,
            namespace: input.namespace.trim(),
            value: input.value.trim(),
            normalizedValue,
            source: input.source.trim(),
            confidence: input.confidence,
            isVerified: input.isVerified,
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetIdentifierTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetIdentifierTable.tenantId, ctx.tenantId),
              eq(assetIdentifierTable.assetId, input.assetId),
              eq(assetIdentifierTable.id, input.id),
              expectedVersion(
                assetIdentifierTable.updateTimeUtc,
                input.expectedUpdateTimeUtc
              ),
              ownerActive(ctx, input.assetId),
              writeGuard(ctx)
            )
          )
          .returning({ id: assetIdentifierTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async assignments(ctx: TenantContext, input: ChildListInput) {
    const { pageNo, pageSize } = pagination(input);
    const where = and(
      eq(assetAssignmentTable.tenantId, ctx.tenantId),
      eq(assetAssignmentTable.assetId, input.assetId),
      readGuard(ctx)
    );
    const total =
      (
        await db
          .select({ total: count() })
          .from(assetAssignmentTable)
          .where(where)
      )[0]?.total ?? 0;
    const list = await db
      .select()
      .from(assetAssignmentTable)
      .where(where)
      .orderBy(
        input.descend === false
          ? asc(assetAssignmentTable.validFromUtc)
          : desc(assetAssignmentTable.validFromUtc),
        asc(assetAssignmentTable.id)
      )
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    return pages(list, total, pageNo, pageSize);
  }

  async assign(ctx: TenantContext, input: AssignInput) {
    const end = input.validToUtc ?? null;
    const oldId = input.replacesId ?? null;
    const replacement =
      oldId === null
        ? sql`1 = 1`
        : sql`EXISTS (SELECT 1 FROM enterprise_asset_assignment AS previous
      WHERE previous.tenant_id = ${ctx.tenantId} AND previous.asset_id = ${input.assetId} AND previous.id = ${oldId}
      AND previous.valid_to_utc IS NULL AND previous.valid_from_utc < ${input.validFromUtc}
      AND previous.update_time_utc IS ${input.expectedUpdateTimeUtc ?? null})`;
    const host =
      input.hostAssetId === null
        ? sql`1 = 1`
        : sql`EXISTS (SELECT 1 FROM enterprise_asset AS host
      JOIN enterprise_asset AS owner ON owner.tenant_id = host.tenant_id
      WHERE host.tenant_id = ${ctx.tenantId} AND host.id = ${input.hostAssetId} AND host.category = 'host' AND host.status = 'active'
      AND owner.id = ${input.assetId} AND owner.category != 'host' AND owner.id != host.id)`;
    const insert = db
      .insert(assetAssignmentTable)
      .select(
        sql`SELECT NULL, ${ctx.tenantId}, ${input.assetId},
      ${input.hostAssetId}, ${input.location.trim()}, ${input.validFromUtc}, ${end}, ${input.reason.trim()}, NULL,
      ${human(ctx)}, NULL, ${getCurrentTimestampUtcSql()}, NULL
      WHERE ${writeGuard(ctx)} AND ${ownerActive(ctx, input.assetId)} AND ${intervalValid(input.validFromUtc, end)}
      AND ${host} AND ${replacement} AND NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS history
        WHERE history.tenant_id = ${ctx.tenantId} AND history.asset_id = ${input.assetId}
        AND (${oldId} IS NULL OR history.id != ${oldId})
        AND ${overlaps(input.validFromUtc, end, sql`history.valid_from_utc`, sql`history.valid_to_utc`)})`
      )
      .returning({ id: assetAssignmentTable.id });
    if (oldId === null) {
      const [, , result] = await guardedAssetWrite(() =>
        db.batch([
          this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
          assertChanged(),
          insert,
          assertChanged(),
        ])
      );
      return result[0].id;
    }
    const [, , result] = await guardedAssetWrite(() =>
      db.batch([
        this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
        assertChanged(),
        insert,
        assertChanged(),
        db
          .update(assetAssignmentTable)
          .set({
            validToUtc: input.validFromUtc,
            closeReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetAssignmentTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetAssignmentTable.tenantId, ctx.tenantId),
              eq(assetAssignmentTable.assetId, input.assetId),
              eq(assetAssignmentTable.id, oldId),
              sql`${assetAssignmentTable.validToUtc} IS NULL`,
              expectedVersion(
                assetAssignmentTable.updateTimeUtc,
                input.expectedUpdateTimeUtc ?? null
              ),
              writeGuard(ctx)
            )
          )
          .returning({ id: assetAssignmentTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async closeAssignment(ctx: TenantContext, input: CloseRelationInput) {
    const [, , result] = await guardedAssetWrite(() =>
      db.batch([
        this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
        assertChanged(),
        db
          .update(assetAssignmentTable)
          .set({
            validToUtc: input.validToUtc,
            closeReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetAssignmentTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetAssignmentTable.tenantId, ctx.tenantId),
              eq(assetAssignmentTable.assetId, input.assetId),
              eq(assetAssignmentTable.id, input.id),
              sql`${assetAssignmentTable.validToUtc} IS NULL`,
              expectedVersion(
                assetAssignmentTable.updateTimeUtc,
                input.expectedUpdateTimeUtc
              ),
              sql`${input.validToUtc} > ${assetAssignmentTable.validFromUtc} AND ${input.validToUtc} <= ${getCurrentTimestampUtcSql()}`,
              writeGuard(ctx)
            )
          )
          .returning({ id: assetAssignmentTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async bindings(ctx: TenantContext, input: ChildListInput) {
    const { pageNo, pageSize } = pagination(input);
    const where = and(
      eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
      eq(assetMeasurementBindingTable.assetId, input.assetId),
      readGuard(ctx)
    );
    const total =
      (
        await db
          .select({ total: count() })
          .from(assetMeasurementBindingTable)
          .where(where)
      )[0]?.total ?? 0;
    const list = await db
      .select()
      .from(assetMeasurementBindingTable)
      .where(where)
      .orderBy(
        input.descend === false
          ? asc(assetMeasurementBindingTable.validFromUtc)
          : desc(assetMeasurementBindingTable.validFromUtc),
        asc(assetMeasurementBindingTable.id)
      )
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    return pages(list, total, pageNo, pageSize);
  }

  async bind(ctx: TenantContext, input: BindInput) {
    const end = input.validToUtc ?? null;
    const oldId = input.replacesId ?? null;
    const key = (
      alias: string
    ) => sql`${sql.identifier(alias)}.source_system = ${input.sourceSystem.trim()}
      AND ${sql.identifier(alias)}.collector_id = ${input.collectorId.trim()} AND ${sql.identifier(alias)}.device_id = ${input.deviceId.trim()}
      AND ${sql.identifier(alias)}.metric = ${input.metric.trim()} AND ${sql.identifier(alias)}.channel = ${input.channel.trim()}`;
    const replacement =
      oldId === null
        ? sql`1 = 1`
        : sql`EXISTS (SELECT 1 FROM enterprise_asset_measurement_binding AS previous
      WHERE previous.tenant_id = ${ctx.tenantId} AND previous.asset_id = ${input.assetId} AND previous.id = ${oldId}
      AND previous.valid_to_utc IS NULL AND previous.valid_from_utc < ${input.validFromUtc}
      AND previous.update_time_utc IS ${input.expectedUpdateTimeUtc ?? null})`;
    const insert = db
      .insert(assetMeasurementBindingTable)
      .select(
        sql`SELECT NULL, ${ctx.tenantId}, ${input.assetId},
      ${input.sourceSystem.trim()}, ${input.collectorId.trim()}, ${input.deviceId.trim()}, ${input.metric.trim()}, ${input.channel.trim()},
      ${input.validFromUtc}, ${end}, ${input.reason.trim()}, NULL, ${human(ctx)}, NULL, ${getCurrentTimestampUtcSql()}, NULL
      WHERE ${writeGuard(ctx)} AND ${ownerActive(ctx, input.assetId)} AND ${intervalValid(input.validFromUtc, end)}
      AND ${replacement} AND NOT EXISTS (SELECT 1 FROM enterprise_asset_measurement_binding AS history
        WHERE history.tenant_id = ${ctx.tenantId} AND ${key("history")} AND (${oldId} IS NULL OR history.id != ${oldId})
        AND ${overlaps(input.validFromUtc, end, sql`history.valid_from_utc`, sql`history.valid_to_utc`)})`
      )
      .returning({ id: assetMeasurementBindingTable.id });
    if (oldId === null) {
      const [, , result] = await guardedAssetWrite(() =>
        db.batch([
          this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
          assertChanged(),
          insert,
          assertChanged(),
        ])
      );
      return result[0].id;
    }
    const [, , result] = await guardedAssetWrite(() =>
      db.batch([
        this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
        assertChanged(),
        insert,
        assertChanged(),
        db
          .update(assetMeasurementBindingTable)
          .set({
            validToUtc: input.validFromUtc,
            closeReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetMeasurementBindingTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
              eq(assetMeasurementBindingTable.assetId, input.assetId),
              eq(assetMeasurementBindingTable.id, oldId),
              sql`${assetMeasurementBindingTable.validToUtc} IS NULL`,
              expectedVersion(
                assetMeasurementBindingTable.updateTimeUtc,
                input.expectedUpdateTimeUtc ?? null
              ),
              writeGuard(ctx)
            )
          )
          .returning({ id: assetMeasurementBindingTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  async closeBinding(ctx: TenantContext, input: CloseRelationInput) {
    const [, , result] = await guardedAssetWrite(() =>
      db.batch([
        this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc),
        assertChanged(),
        db
          .update(assetMeasurementBindingTable)
          .set({
            validToUtc: input.validToUtc,
            closeReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: sql`MAX(${getCurrentTimestampUtcSql()}, COALESCE(${assetMeasurementBindingTable.updateTimeUtc}, 0) + 1)`,
          })
          .where(
            and(
              eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
              eq(assetMeasurementBindingTable.assetId, input.assetId),
              eq(assetMeasurementBindingTable.id, input.id),
              sql`${assetMeasurementBindingTable.validToUtc} IS NULL`,
              expectedVersion(
                assetMeasurementBindingTable.updateTimeUtc,
                input.expectedUpdateTimeUtc
              ),
              sql`${input.validToUtc} > ${assetMeasurementBindingTable.validFromUtc} AND ${input.validToUtc} <= ${getCurrentTimestampUtcSql()}`,
              writeGuard(ctx)
            )
          )
          .returning({ id: assetMeasurementBindingTable.id }),
        assertChanged(),
      ])
    );
    return result[0].id;
  }

  private projection() {
    return {
      assetId: assetTable.assetId,
      bindingId: assetMeasurementBindingTable.id,
      sourceSystem: assetMeasurementBindingTable.sourceSystem,
      collectorId: assetMeasurementBindingTable.collectorId,
      deviceId: assetMeasurementBindingTable.deviceId,
      metric: assetMeasurementBindingTable.metric,
      channel: assetMeasurementBindingTable.channel,
      validFromUtc: assetMeasurementBindingTable.validFromUtc,
      validToUtc: assetMeasurementBindingTable.validToUtc,
      updateTimeUtc: assetMeasurementBindingTable.updateTimeUtc,
    };
  }
  async resolve(ctx: TenantContext, input: MappingResolveInput) {
    const rows = await db
      .select(this.projection())
      .from(assetMeasurementBindingTable)
      .innerJoin(
        assetTable,
        and(
          eq(assetTable.tenantId, assetMeasurementBindingTable.tenantId),
          eq(assetTable.id, assetMeasurementBindingTable.assetId)
        )
      )
      .where(
        and(
          eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
          tenantGuard(ctx),
          eq(
            assetMeasurementBindingTable.sourceSystem,
            input.sourceSystem.trim()
          ),
          eq(
            assetMeasurementBindingTable.collectorId,
            input.collectorId.trim()
          ),
          eq(assetMeasurementBindingTable.deviceId, input.deviceId.trim()),
          eq(assetMeasurementBindingTable.metric, input.metric.trim()),
          eq(assetMeasurementBindingTable.channel, input.channel.trim()),
          sql`${assetMeasurementBindingTable.validFromUtc} <= ${input.observedTimeUtc}`,
          sql`(${assetMeasurementBindingTable.validToUtc} IS NULL OR ${assetMeasurementBindingTable.validToUtc} > ${input.observedTimeUtc})`
        )
      )
      .limit(2);
    if (rows.length > 1) throw new BusinessError(AssetError.AMBIGUOUS_MAPPING);
    return rows[0]
      ? { status: "matched" as const, mapping: rows[0] }
      : { status: "unmapped" as const, mapping: null };
  }
  async mappingPage(ctx: TenantContext, input: MappingListInput) {
    const { pageNo, pageSize } = pagination(input);
    const where = and(
      eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
      tenantGuard(ctx),
      input.sourceSystem
        ? eq(
            assetMeasurementBindingTable.sourceSystem,
            input.sourceSystem.trim()
          )
        : undefined,
      input.collectorId
        ? eq(assetMeasurementBindingTable.collectorId, input.collectorId.trim())
        : undefined
    );
    const total =
      (
        await db
          .select({ total: count() })
          .from(assetMeasurementBindingTable)
          .where(where)
      )[0]?.total ?? 0;
    const list = await db
      .select(this.projection())
      .from(assetMeasurementBindingTable)
      .innerJoin(
        assetTable,
        and(
          eq(assetTable.tenantId, assetMeasurementBindingTable.tenantId),
          eq(assetTable.id, assetMeasurementBindingTable.assetId)
        )
      )
      .where(where)
      .orderBy(asc(assetMeasurementBindingTable.id))
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    return pages(list, total, pageNo, pageSize);
  }
}
export const assetRepository = new AssetRepository();
