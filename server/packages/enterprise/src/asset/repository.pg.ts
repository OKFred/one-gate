import {
  and,
  asc,
  desc,
  eq,
  like,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  postgresNowMilliseconds,
  postgresSafeInteger,
} from "@hodor/core/db/postgresql/sql";
import { isPostgresUniqueConflict } from "@hodor/core/db/postgresql/errors";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { TenantContext } from "../tenant/context";
import { postgresTenantGuard } from "../tenant/context.pg";
import {
  assetTable,
  assetIdentifierTable,
  assetAssignmentTable,
  assetMeasurementBindingTable,
} from "./schema.pg";
import type {
  AssetListInput,
  AssetAddInput,
  AssetUpdateInput,
  AssetStateInput,
  IdentifierAddInput,
  IdentifierUpdateInput,
  ChildListInput,
  AssignInput,
  BindInput,
  CloseRelationInput,
  MappingResolveInput,
  MappingListInput,
} from "./model";
import { AssetError } from "./errors";

function conflict(): never {
  throw new BusinessError(AssetError.STATE_CONFLICT);
}
function human(ctx: TenantContext): number {
  if (ctx.principal.kind !== "user")
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return ctx.principal.userId;
}
function readGuard(ctx: TenantContext): SQL {
  human(ctx);
  return postgresTenantGuard(ctx);
}
function writeGuard(ctx: TenantContext): SQL {
  human(ctx);
  if (ctx.capability === "read")
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return postgresTenantGuard(ctx);
}
function version(column: SQLWrapper): SQL<number> {
  return sql<number>`GREATEST(${postgresNowMilliseconds()}, COALESCE(${column}, 0) + 1)`;
}
function expectedVersion(column: SQLWrapper, expected: number | null): SQL {
  return sql`${column} IS NOT DISTINCT FROM ${expected}`;
}
function ownerActive(ctx: TenantContext, assetId: number): SQL {
  return sql`EXISTS (SELECT 1 FROM enterprise_asset AS owner WHERE owner.tenant_id = ${ctx.tenantId} AND owner.id = ${assetId} AND owner.status = 'active')`;
}
function overlaps(
  start: number,
  end: number | null,
  otherStart: SQL,
  otherEnd: SQL
): SQL {
  return sql`(${otherEnd} IS NULL OR ${start}::bigint < ${otherEnd}) AND (${end}::bigint IS NULL OR ${otherStart} < ${end}::bigint)`;
}
function intervalValid(start: number, end: number | null): SQL {
  return sql`${start}::bigint >= 0 AND ${start}::bigint <= ${postgresNowMilliseconds()}
    AND (${end}::bigint IS NULL OR (${end}::bigint > ${start}::bigint AND ${end}::bigint <= ${postgresNowMilliseconds()}))`;
}
function oneId(rows: { id: number }[]): number {
  return rows.length === 1 ? rows[0].id : conflict();
}
async function insertId(query: SQL): Promise<number> {
  const result = await getPostgresDb().execute<{ id: unknown }>(query);
  if (result.rows.length !== 1) conflict();
  return postgresSafeInteger(result.rows[0].id);
}
async function write<T>(operation: () => Promise<T>): Promise<T> {
  return withPostgresTransaction(
    async () => {
      try {
        return await operation();
      } catch (error) {
        if (
          isPostgresUniqueConflict(
            error,
            "enterprise_asset_identifier_verified_unique"
          )
        )
          throw new BusinessError(AssetError.IDENTIFIER_CONFLICT);
        if (
          isPostgresUniqueConflict(error, "enterprise_asset_tenant_code_unique")
        )
          throw new BusinessError(AssetError.CODE_CONFLICT);
        throw error;
      }
    },
    { write: true }
  );
}
const publicColumns = {
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

class PostgresAssetRepository {
  private async assetCas(
    ctx: TenantContext,
    id: number,
    expected: number | null
  ): Promise<number> {
    return oneId(
      await getPostgresDb()
        .update(assetTable)
        .set({
          updaterId: human(ctx),
          updateTimeUtc: version(assetTable.updateTimeUtc),
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
        .returning({ id: assetTable.id })
    );
  }
  findPage(ctx: TenantContext, input: AssetListInput) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
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
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(assetTable)
        .where(where);
      const sort = publicColumns[input.orderBy ?? "id"];
      const list = await db
        .select(publicColumns)
        .from(assetTable)
        .where(where)
        .orderBy(input.descend === false ? asc(sort) : desc(sort))
        .limit(pageSize)
        .offset((pageNo - 1) * pageSize);
      return pages(list, total?.total ?? 0, pageNo, pageSize);
    });
  }
  findById(ctx: TenantContext, id: number) {
    return withPostgresTransaction(async () => {
      const [asset] = await getPostgresDb()
        .select(publicColumns)
        .from(assetTable)
        .where(
          and(
            eq(assetTable.tenantId, ctx.tenantId),
            eq(assetTable.id, id),
            readGuard(ctx)
          )
        )
        .limit(1);
      return asset ?? null;
    });
  }
  add(ctx: TenantContext, input: AssetAddInput): Promise<number> {
    return write(() =>
      insertId(sql`INSERT INTO enterprise_asset (tenant_id, asset_id, asset_code, name, category, brand, model, remark,
      status, retired_time_utc, state_reason, creator_id, updater_id, create_time_utc, update_time_utc)
      SELECT ${ctx.tenantId}, ${crypto.randomUUID()}, ${input.assetCode?.trim() || null}, ${input.name.trim()}, ${input.category},
        ${input.brand?.trim() || null}, ${input.model?.trim() || null}, ${input.remark?.trim() || null}, 'active', NULL, NULL,
        ${human(ctx)}, NULL, ${postgresNowMilliseconds()}, NULL WHERE ${writeGuard(ctx)} RETURNING id`)
    );
  }
  update(ctx: TenantContext, input: AssetUpdateInput): Promise<number> {
    return write(async () =>
      oneId(
        await getPostgresDb()
          .update(assetTable)
          .set({
            name: input.name.trim(),
            category: input.category,
            assetCode: input.assetCode?.trim() || null,
            brand: input.brand?.trim() || null,
            model: input.model?.trim() || null,
            remark: input.remark?.trim() || null,
            updaterId: human(ctx),
            updateTimeUtc: version(assetTable.updateTimeUtc),
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
              sql`(${input.category}::text = 'host' OR NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS child
          WHERE child.tenant_id = ${ctx.tenantId} AND child.host_asset_id = ${input.id} AND child.valid_to_utc IS NULL))`
            )
          )
          .returning({ id: assetTable.id })
      )
    );
  }
  retire(ctx: TenantContext, input: AssetStateInput): Promise<number> {
    return write(async () => {
      const db = getPostgresDb();
      const actorId = human(ctx);
      const rows = await db
        .update(assetTable)
        .set({
          status: "retired",
          retiredTimeUtc: postgresNowMilliseconds(),
          stateReason: input.reason.trim(),
          updaterId: actorId,
          updateTimeUtc: version(assetTable.updateTimeUtc),
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
            sql`NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS child WHERE child.tenant_id = ${ctx.tenantId} AND child.host_asset_id = ${input.id} AND child.valid_to_utc IS NULL)`,
            sql`NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS history WHERE history.tenant_id = ${ctx.tenantId} AND history.asset_id = ${input.id}
            AND history.valid_to_utc IS NULL AND history.valid_from_utc >= ${postgresNowMilliseconds()})`,
            sql`NOT EXISTS (SELECT 1 FROM enterprise_asset_measurement_binding AS history WHERE history.tenant_id = ${ctx.tenantId} AND history.asset_id = ${input.id}
            AND history.valid_to_utc IS NULL AND history.valid_from_utc >= ${postgresNowMilliseconds()})`
          )
        )
        .returning({
          id: assetTable.id,
          retiredTimeUtc: assetTable.retiredTimeUtc,
        });
      const id = oneId(rows);
      const retiredAt = rows[0].retiredTimeUtc;
      if (retiredAt === null) conflict();
      await db
        .update(assetAssignmentTable)
        .set({
          validToUtc: retiredAt,
          closeReason: input.reason.trim(),
          updaterId: actorId,
          updateTimeUtc: version(assetAssignmentTable.updateTimeUtc),
        })
        .where(
          and(
            eq(assetAssignmentTable.tenantId, ctx.tenantId),
            eq(assetAssignmentTable.assetId, input.id),
            sql`${assetAssignmentTable.validToUtc} IS NULL`
          )
        );
      await db
        .update(assetMeasurementBindingTable)
        .set({
          validToUtc: retiredAt,
          closeReason: input.reason.trim(),
          updaterId: actorId,
          updateTimeUtc: version(assetMeasurementBindingTable.updateTimeUtc),
        })
        .where(
          and(
            eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
            eq(assetMeasurementBindingTable.assetId, input.id),
            sql`${assetMeasurementBindingTable.validToUtc} IS NULL`
          )
        );
      return id;
    });
  }
  activate(ctx: TenantContext, input: AssetStateInput): Promise<number> {
    return write(async () =>
      oneId(
        await getPostgresDb()
          .update(assetTable)
          .set({
            status: "active",
            retiredTimeUtc: null,
            stateReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: version(assetTable.updateTimeUtc),
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
          .returning({ id: assetTable.id })
      )
    );
  }
  identifiers(ctx: TenantContext, input: ChildListInput) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const where = and(
        eq(assetIdentifierTable.tenantId, ctx.tenantId),
        eq(assetIdentifierTable.assetId, input.assetId),
        readGuard(ctx)
      );
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(assetIdentifierTable)
        .where(where);
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
      return pages(list, total?.total ?? 0, pageNo, pageSize);
    });
  }
  addIdentifier(
    ctx: TenantContext,
    input: IdentifierAddInput,
    normalizedValue: string
  ): Promise<number> {
    return write(async () => {
      await this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc);
      return insertId(sql`INSERT INTO enterprise_asset_identifier (tenant_id, asset_id, identifier_type, namespace, value, normalized_value,
        source, confidence, is_verified, creator_id, updater_id, create_time_utc, update_time_utc)
        SELECT ${ctx.tenantId}, ${input.assetId}, ${input.identifierType}, ${input.namespace.trim()}, ${input.value.trim()}, ${normalizedValue},
          ${input.source.trim()}, ${input.confidence}, ${input.isVerified}, ${human(ctx)}, NULL, ${postgresNowMilliseconds()}, NULL
        WHERE ${writeGuard(ctx)} AND ${ownerActive(ctx, input.assetId)} RETURNING id`);
    });
  }
  updateIdentifier(
    ctx: TenantContext,
    input: IdentifierUpdateInput,
    normalizedValue: string
  ): Promise<number> {
    return write(async () => {
      await this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc);
      return oneId(
        await getPostgresDb()
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
            updateTimeUtc: version(assetIdentifierTable.updateTimeUtc),
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
          .returning({ id: assetIdentifierTable.id })
      );
    });
  }
  assignments(ctx: TenantContext, input: ChildListInput) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const where = and(
        eq(assetAssignmentTable.tenantId, ctx.tenantId),
        eq(assetAssignmentTable.assetId, input.assetId),
        readGuard(ctx)
      );
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(assetAssignmentTable)
        .where(where);
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
      return pages(list, total?.total ?? 0, pageNo, pageSize);
    });
  }
  assign(ctx: TenantContext, input: AssignInput): Promise<number> {
    return write(async () => {
      await this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc);
      const end = input.validToUtc ?? null;
      const oldId = input.replacesId ?? null;
      const replacement =
        oldId === null
          ? sql`TRUE`
          : sql`EXISTS (SELECT 1 FROM enterprise_asset_assignment AS previous WHERE previous.tenant_id = ${ctx.tenantId}
        AND previous.asset_id = ${input.assetId} AND previous.id = ${oldId} AND previous.valid_to_utc IS NULL AND previous.valid_from_utc < ${input.validFromUtc}
        AND previous.update_time_utc IS NOT DISTINCT FROM ${input.expectedUpdateTimeUtc ?? null})`;
      const host =
        input.hostAssetId === null
          ? sql`TRUE`
          : sql`EXISTS (SELECT 1 FROM enterprise_asset AS host JOIN enterprise_asset AS owner ON owner.tenant_id = host.tenant_id
        WHERE host.tenant_id = ${ctx.tenantId} AND host.id = ${input.hostAssetId} AND host.category = 'host' AND host.status = 'active'
          AND owner.id = ${input.assetId} AND owner.category != 'host' AND owner.id != host.id)`;
      const id =
        await insertId(sql`INSERT INTO enterprise_asset_assignment (tenant_id, asset_id, host_asset_id, location, valid_from_utc, valid_to_utc,
        reason, close_reason, creator_id, updater_id, create_time_utc, update_time_utc)
        SELECT ${ctx.tenantId}, ${input.assetId}, ${input.hostAssetId}, ${input.location.trim()}, ${input.validFromUtc}, ${end}, ${input.reason.trim()},
          NULL, ${human(ctx)}, NULL, ${postgresNowMilliseconds()}, NULL
        WHERE ${writeGuard(ctx)} AND ${ownerActive(ctx, input.assetId)} AND ${intervalValid(input.validFromUtc, end)} AND ${host} AND ${replacement}
          AND NOT EXISTS (SELECT 1 FROM enterprise_asset_assignment AS history WHERE history.tenant_id = ${ctx.tenantId} AND history.asset_id = ${input.assetId}
            AND (${oldId}::bigint IS NULL OR history.id != ${oldId}::bigint) AND ${overlaps(input.validFromUtc, end, sql`history.valid_from_utc`, sql`history.valid_to_utc`)}) RETURNING id`);
      if (oldId !== null) {
        oneId(
          await getPostgresDb()
            .update(assetAssignmentTable)
            .set({
              validToUtc: input.validFromUtc,
              closeReason: input.reason.trim(),
              updaterId: human(ctx),
              updateTimeUtc: version(assetAssignmentTable.updateTimeUtc),
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
            .returning({ id: assetAssignmentTable.id })
        );
      }
      return id;
    });
  }
  closeAssignment(
    ctx: TenantContext,
    input: CloseRelationInput
  ): Promise<number> {
    return write(async () => {
      await this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc);
      return oneId(
        await getPostgresDb()
          .update(assetAssignmentTable)
          .set({
            validToUtc: input.validToUtc,
            closeReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: version(assetAssignmentTable.updateTimeUtc),
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
              sql`${input.validToUtc} > ${assetAssignmentTable.validFromUtc} AND ${input.validToUtc}::bigint <= ${postgresNowMilliseconds()}`,
              writeGuard(ctx)
            )
          )
          .returning({ id: assetAssignmentTable.id })
      );
    });
  }
  bindings(ctx: TenantContext, input: ChildListInput) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const where = and(
        eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
        eq(assetMeasurementBindingTable.assetId, input.assetId),
        readGuard(ctx)
      );
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(assetMeasurementBindingTable)
        .where(where);
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
      return pages(list, total?.total ?? 0, pageNo, pageSize);
    });
  }
  bind(ctx: TenantContext, input: BindInput): Promise<number> {
    return write(async () => {
      await this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc);
      const end = input.validToUtc ?? null;
      const oldId = input.replacesId ?? null;
      const key = (
        alias: string
      ) => sql`${sql.identifier(alias)}.source_system = ${input.sourceSystem.trim()}
        AND ${sql.identifier(alias)}.collector_id = ${input.collectorId.trim()} AND ${sql.identifier(alias)}.device_id = ${input.deviceId.trim()}
        AND ${sql.identifier(alias)}.metric = ${input.metric.trim()} AND ${sql.identifier(alias)}.channel = ${input.channel.trim()}`;
      const replacement =
        oldId === null
          ? sql`TRUE`
          : sql`EXISTS (SELECT 1 FROM enterprise_asset_measurement_binding AS previous WHERE previous.tenant_id = ${ctx.tenantId}
        AND previous.asset_id = ${input.assetId} AND previous.id = ${oldId} AND previous.valid_to_utc IS NULL AND previous.valid_from_utc < ${input.validFromUtc}
        AND previous.update_time_utc IS NOT DISTINCT FROM ${input.expectedUpdateTimeUtc ?? null})`;
      const id =
        await insertId(sql`INSERT INTO enterprise_asset_measurement_binding (tenant_id, asset_id, source_system, collector_id, device_id, metric, channel,
        valid_from_utc, valid_to_utc, reason, close_reason, creator_id, updater_id, create_time_utc, update_time_utc)
        SELECT ${ctx.tenantId}, ${input.assetId}, ${input.sourceSystem.trim()}, ${input.collectorId.trim()}, ${input.deviceId.trim()}, ${input.metric.trim()}, ${input.channel.trim()},
          ${input.validFromUtc}, ${end}, ${input.reason.trim()}, NULL, ${human(ctx)}, NULL, ${postgresNowMilliseconds()}, NULL
        WHERE ${writeGuard(ctx)} AND ${ownerActive(ctx, input.assetId)} AND ${intervalValid(input.validFromUtc, end)} AND ${replacement}
          AND NOT EXISTS (SELECT 1 FROM enterprise_asset_measurement_binding AS history WHERE history.tenant_id = ${ctx.tenantId} AND ${key("history")}
            AND (${oldId}::bigint IS NULL OR history.id != ${oldId}::bigint) AND ${overlaps(input.validFromUtc, end, sql`history.valid_from_utc`, sql`history.valid_to_utc`)}) RETURNING id`);
      if (oldId !== null) {
        oneId(
          await getPostgresDb()
            .update(assetMeasurementBindingTable)
            .set({
              validToUtc: input.validFromUtc,
              closeReason: input.reason.trim(),
              updaterId: human(ctx),
              updateTimeUtc: version(
                assetMeasurementBindingTable.updateTimeUtc
              ),
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
            .returning({ id: assetMeasurementBindingTable.id })
        );
      }
      return id;
    });
  }
  closeBinding(ctx: TenantContext, input: CloseRelationInput): Promise<number> {
    return write(async () => {
      await this.assetCas(ctx, input.assetId, input.expectedAssetUpdateTimeUtc);
      return oneId(
        await getPostgresDb()
          .update(assetMeasurementBindingTable)
          .set({
            validToUtc: input.validToUtc,
            closeReason: input.reason.trim(),
            updaterId: human(ctx),
            updateTimeUtc: version(assetMeasurementBindingTable.updateTimeUtc),
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
              sql`${input.validToUtc} > ${assetMeasurementBindingTable.validFromUtc} AND ${input.validToUtc}::bigint <= ${postgresNowMilliseconds()}`,
              writeGuard(ctx)
            )
          )
          .returning({ id: assetMeasurementBindingTable.id })
      );
    });
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
  resolve(ctx: TenantContext, input: MappingResolveInput) {
    return withPostgresTransaction(async () => {
      const rows = await getPostgresDb()
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
            postgresTenantGuard(ctx),
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
      if (rows.length > 1)
        throw new BusinessError(AssetError.AMBIGUOUS_MAPPING);
      return rows[0]
        ? { status: "matched" as const, mapping: rows[0] }
        : { status: "unmapped" as const, mapping: null };
    });
  }
  mappingPage(ctx: TenantContext, input: MappingListInput) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const where = and(
        eq(assetMeasurementBindingTable.tenantId, ctx.tenantId),
        postgresTenantGuard(ctx),
        input.sourceSystem
          ? eq(
              assetMeasurementBindingTable.sourceSystem,
              input.sourceSystem.trim()
            )
          : undefined,
        input.collectorId
          ? eq(
              assetMeasurementBindingTable.collectorId,
              input.collectorId.trim()
            )
          : undefined
      );
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(assetMeasurementBindingTable)
        .where(where);
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
      return pages(list, total?.total ?? 0, pageNo, pageSize);
    });
  }
}

export const postgresAssetRepository = new PostgresAssetRepository();
