import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  postgresNowMilliseconds,
  postgresSafeInteger,
} from "@hodor/core/db/postgresql/sql";
import { isPostgresUniqueConflict } from "@hodor/core/db/postgresql/errors";
import { registry } from "@hodor/admin/common/registry";
import type { AuthPrincipal } from "@hodor/core/types/app";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import {
  tenantTable,
  tenantMemberTable,
  tenantApiTokenGrantTable,
} from "./schema.pg";
import type {
  TenantRole,
  TenantListInput,
  TenantCreateInput,
  TenantUpdateInput,
  TenantChildrenListInput,
  TenantMemberSetInput,
  TenantOwnerTransferInput,
  TenantOwnerRecoverInput,
  TenantTokenGrantSetInput,
} from "./model";
import type { TenantContext } from "./context";
import {
  postgresActiveOwnerExists,
  postgresHumanPermissionSql,
  postgresTenantGuard,
} from "./context.pg";
import { TenantError, tenantConflict } from "./errors";

type Human = Extract<AuthPrincipal, { kind: "user" }>;
const now = postgresNowMilliseconds;
const version = (column: SQL) => sql<number>`GREATEST(${now()}, ${column} + 1)`;
function humanId(context: TenantContext): number {
  if (context.principal.kind !== "user")
    throw new BusinessError(TenantError.HUMAN_REQUIRED);
  return context.principal.userId;
}
function manageGuard(context: TenantContext): SQL {
  return postgresTenantGuard({ ...context, capability: "manage" });
}
function ownerGuard(context: TenantContext): SQL {
  return sql`${manageGuard(context)} AND EXISTS (SELECT 1 FROM enterprise_tenant_member AS acting_owner
    WHERE acting_owner.tenant_id = ${context.tenantId} AND acting_owner.user_id = ${humanId(context)}
      AND acting_owner.is_enabled = TRUE AND acting_owner.role = 'owner')`;
}
function oneId(rows: { id: number }[]): number {
  return rows.length === 1 ? rows[0].id : tenantConflict();
}
async function insertId(query: SQL): Promise<number> {
  const result = await getPostgresDb().execute<{ id: unknown }>(query);
  if (result.rows.length !== 1) tenantConflict();
  return postgresSafeInteger(result.rows[0].id);
}
async function touchTenant(context: TenantContext): Promise<void> {
  oneId(
    await getPostgresDb()
      .update(tenantTable)
      .set({
        updaterId: humanId(context),
        updateTimeUtc: version(sql`${tenantTable.updateTimeUtc}`),
      })
      .where(
        and(
          eq(tenantTable.id, context.tenantId),
          eq(tenantTable.isEnabled, true),
          registry.system.access.userActiveSql(humanId(context))
        )
      )
      .returning({ id: tenantTable.id })
  );
}
function pagination(input: { pageNo?: number; pageSize?: number }) {
  return {
    pageNo: input.pageNo ?? 1,
    pageSize: Math.min(input.pageSize ?? 20, 1000),
  };
}
function pageResult<T>(
  list: T[],
  total: number,
  pageNo: number,
  pageSize: number
) {
  return {
    list,
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
  };
}

export const postgresTenantRepository = {
  canManagePlatform(principal: Human): Promise<boolean> {
    return withPostgresTransaction(async () => {
      const rows = await getPostgresDb()
        .select({ allowed: sql<number>`1` })
        .from(sql`(SELECT 1) AS access_check`)
        .where(registry.system.access.platformAdminSql(principal.userId));
      return rows.length === 1;
    });
  },
  list(input: TenantListInput, principal: Human, platform = false) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const callerMembership = sql`EXISTS (SELECT 1 FROM enterprise_tenant_member AS own_membership
        WHERE own_membership.tenant_id = ${tenantTable.id} AND own_membership.user_id = ${principal.userId} AND own_membership.is_enabled = TRUE)`;
      const guard = platform
        ? registry.system.access.platformAdminSql(principal.userId)
        : sql`${postgresHumanPermissionSql(principal.userId, "enterprise.tenant:read")} AND ${callerMembership}`;
      const where = and(
        guard,
        input.keyword
          ? or(
              like(tenantTable.key, `%${input.keyword}%`),
              like(tenantTable.name, `%${input.keyword}%`)
            )
          : undefined
      );
      const sort = {
        id: tenantTable.id,
        key: tenantTable.key,
        name: tenantTable.name,
        createTimeUtc: tenantTable.createTimeUtc,
      }[input.orderBy ?? "id"];
      const rows = await db
        .select({
          id: tenantTable.id,
          key: tenantTable.key,
          name: tenantTable.name,
          isEnabled: tenantTable.isEnabled,
          creatorId: tenantTable.creatorId,
          updaterId: tenantTable.updaterId,
          createTimeUtc: tenantTable.createTimeUtc,
          updateTimeUtc: tenantTable.updateTimeUtc,
          memberRole: sql<TenantRole | null>`(SELECT visible_member.role FROM enterprise_tenant_member AS visible_member WHERE visible_member.tenant_id = ${tenantTable.id}
          AND visible_member.user_id = ${principal.userId} AND visible_member.is_enabled = TRUE LIMIT 1)`,
          frozen: sql<boolean>`(NOT ${tenantTable.isEnabled} OR NOT ${postgresActiveOwnerExists(sql`${tenantTable.id}`)})`,
        })
        .from(tenantTable)
        .where(where)
        .orderBy(input.descend === false ? asc(sort) : desc(sort))
        .limit(pageSize)
        .offset((pageNo - 1) * pageSize);
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(tenantTable)
        .where(where);
      return {
        ...pageResult(rows, total?.total ?? 0, pageNo, pageSize),
        canManagePlatform: await this.canManagePlatform(principal),
      };
    });
  },
  create(input: TenantCreateInput, actor: Human): Promise<number> {
    return withPostgresTransaction(
      async () => {
        try {
          const id =
            await insertId(sql`INSERT INTO enterprise_tenant (key, name, is_enabled, recovery_reason, creator_id, updater_id, create_time_utc, update_time_utc)
          SELECT ${input.key}, ${input.name}, TRUE, NULL, ${actor.userId}, NULL, ${now()}, ${now()}
          WHERE ${registry.system.access.platformAdminSql(actor.userId)} AND ${registry.system.access.userActiveSql(input.ownerUserId)} RETURNING id`);
          await insertId(sql`INSERT INTO enterprise_tenant_member (tenant_id, user_id, role, is_enabled, creator_id, updater_id, create_time_utc, update_time_utc)
          SELECT ${id}, ${input.ownerUserId}, 'owner', TRUE, ${actor.userId}, NULL, ${now()}, ${now()}
          WHERE ${registry.system.access.platformAdminSql(actor.userId)} AND ${registry.system.access.userActiveSql(input.ownerUserId)} RETURNING id`);
          return id;
        } catch (error) {
          if (isPostgresUniqueConflict(error, "enterprise_tenant_key_unique"))
            throw new BusinessError(TenantError.KEY_CONFLICT);
          throw error;
        }
      },
      { write: true }
    );
  },
  update(input: TenantUpdateInput, actor: Human): Promise<number> {
    return withPostgresTransaction(
      async () =>
        oneId(
          await getPostgresDb()
            .update(tenantTable)
            .set({
              name: input.name,
              isEnabled: input.isEnabled,
              updaterId: actor.userId,
              updateTimeUtc: version(sql`${tenantTable.updateTimeUtc}`),
            })
            .where(
              and(
                eq(tenantTable.id, input.tenantId),
                eq(tenantTable.updateTimeUtc, input.expectedUpdateTimeUtc),
                registry.system.access.platformAdminSql(actor.userId)
              )
            )
            .returning({ id: tenantTable.id })
        ),
      { write: true }
    );
  },
  members(input: TenantChildrenListInput, context: TenantContext) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const where = and(
        eq(tenantMemberTable.tenantId, context.tenantId),
        manageGuard(context)
      );
      const members = await db
        .select()
        .from(tenantMemberTable)
        .where(where)
        .orderBy(asc(tenantMemberTable.id))
        .limit(pageSize)
        .offset((pageNo - 1) * pageSize);
      const rows = await Promise.all(
        members.map(async (member) => {
          const user = await registry.system.access.getUserMetadata(
            member.userId
          );
          return {
            ...member,
            username: user?.username ?? null,
            userIsEnabled: user?.isEnabled ?? false,
          };
        })
      );
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(tenantMemberTable)
        .where(where);
      return pageResult(rows, total?.total ?? 0, pageNo, pageSize);
    });
  },
  member(input: { userId: number }, context: TenantContext) {
    return withPostgresTransaction(async () => {
      const [member] = await getPostgresDb()
        .select()
        .from(tenantMemberTable)
        .where(
          and(
            eq(tenantMemberTable.tenantId, context.tenantId),
            eq(tenantMemberTable.userId, input.userId),
            manageGuard(context)
          )
        )
        .limit(1);
      return member ?? null;
    });
  },
  memberSet(
    input: TenantMemberSetInput,
    context: TenantContext
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const actorId = humanId(context);
        const actorOwner = ownerGuard(context);
        const targetPolicy =
          input.role === "owner" ? actorOwner : manageGuard(context);
        let id: number;
        if (input.expectedUpdateTimeUtc === null) {
          id =
            await insertId(sql`INSERT INTO enterprise_tenant_member (tenant_id, user_id, role, is_enabled, creator_id, updater_id, create_time_utc, update_time_utc)
          SELECT ${context.tenantId}, ${input.userId}, ${input.role}, ${input.isEnabled}, ${actorId}, NULL, ${now()}, ${now()}
          WHERE ${targetPolicy} AND ${registry.system.access.userActiveSql(input.userId)} AND NOT EXISTS (SELECT 1 FROM enterprise_tenant_member AS existing_member
            WHERE existing_member.tenant_id = ${context.tenantId} AND existing_member.user_id = ${input.userId}) RETURNING id`);
        } else {
          id = oneId(
            await db
              .update(tenantMemberTable)
              .set({
                role: input.role,
                isEnabled: input.isEnabled,
                updaterId: actorId,
                updateTimeUtc: version(sql`${tenantMemberTable.updateTimeUtc}`),
              })
              .where(
                and(
                  eq(tenantMemberTable.tenantId, context.tenantId),
                  eq(tenantMemberTable.userId, input.userId),
                  eq(
                    tenantMemberTable.updateTimeUtc,
                    input.expectedUpdateTimeUtc
                  ),
                  targetPolicy,
                  sql`(${tenantMemberTable.role} != 'owner' OR ${actorOwner})`,
                  input.isEnabled
                    ? registry.system.access.userActiveSql(input.userId)
                    : undefined,
                  input.role !== "owner" || !input.isEnabled
                    ? sql`(${tenantMemberTable.role} != 'owner' OR NOT ${tenantMemberTable.isEnabled}
              OR NOT ${registry.system.access.userActiveSql(input.userId)} OR ${postgresActiveOwnerExists(context.tenantId, input.userId)})`
                    : undefined
                )
              )
              .returning({ id: tenantMemberTable.id })
          );
        }
        await touchTenant(context);
        return id;
      },
      { write: true }
    );
  },
  transferOwner(
    input: TenantOwnerTransferInput,
    context: TenantContext
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const actorId = humanId(context);
        if (actorId === input.toUserId) tenantConflict();
        oneId(
          await db
            .update(tenantMemberTable)
            .set({
              role: "owner",
              updaterId: actorId,
              updateTimeUtc: version(sql`${tenantMemberTable.updateTimeUtc}`),
            })
            .where(
              and(
                eq(tenantMemberTable.tenantId, context.tenantId),
                eq(tenantMemberTable.userId, input.toUserId),
                eq(
                  tenantMemberTable.updateTimeUtc,
                  input.expectedTargetTimeUtc
                ),
                eq(tenantMemberTable.isEnabled, true),
                ownerGuard(context),
                registry.system.access.userActiveSql(input.toUserId),
                sql`EXISTS (SELECT 1 FROM enterprise_tenant_member AS original_owner WHERE original_owner.tenant_id = ${context.tenantId} AND original_owner.user_id = ${actorId}
            AND original_owner.role = 'owner' AND original_owner.is_enabled = TRUE AND original_owner.update_time_utc = ${input.expectedSourceTimeUtc})`
              )
            )
            .returning({ id: tenantMemberTable.id })
        );
        oneId(
          await db
            .update(tenantMemberTable)
            .set({
              role: "admin",
              updaterId: actorId,
              updateTimeUtc: version(sql`${tenantMemberTable.updateTimeUtc}`),
            })
            .where(
              and(
                eq(tenantMemberTable.tenantId, context.tenantId),
                eq(tenantMemberTable.userId, actorId),
                eq(
                  tenantMemberTable.updateTimeUtc,
                  input.expectedSourceTimeUtc
                ),
                ownerGuard(context),
                postgresActiveOwnerExists(context.tenantId, actorId)
              )
            )
            .returning({ id: tenantMemberTable.id })
        );
        await touchTenant(context);
        return context.tenantId;
      },
      { write: true }
    );
  },
  recoverOwner(input: TenantOwnerRecoverInput, actor: Human): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const id = oneId(
          await db
            .update(tenantTable)
            .set({
              recoveryReason: input.reason,
              updaterId: actor.userId,
              updateTimeUtc: version(sql`${tenantTable.updateTimeUtc}`),
            })
            .where(
              and(
                eq(tenantTable.id, input.tenantId),
                eq(tenantTable.updateTimeUtc, input.expectedUpdateTimeUtc),
                registry.system.access.platformAdminSql(actor.userId),
                registry.system.access.userActiveSql(input.userId)
              )
            )
            .returning({ id: tenantTable.id })
        );
        await insertId(sql`INSERT INTO enterprise_tenant_member (tenant_id, user_id, role, is_enabled, creator_id, updater_id, create_time_utc, update_time_utc)
        SELECT ${input.tenantId}, ${input.userId}, 'owner', TRUE, ${actor.userId}, NULL, ${now()}, ${now()}
        WHERE ${registry.system.access.platformAdminSql(actor.userId)} AND ${registry.system.access.userActiveSql(input.userId)}
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner', is_enabled = TRUE, updater_id = ${actor.userId},
          update_time_utc = GREATEST(${now()}, enterprise_tenant_member.update_time_utc + 1) RETURNING id`);
        return id;
      },
      { write: true }
    );
  },
  tokenGrants(input: TenantChildrenListInput, context: TenantContext) {
    return withPostgresTransaction(async () => {
      const db = getPostgresDb();
      const { pageNo, pageSize } = pagination(input);
      const where = and(
        eq(tenantApiTokenGrantTable.tenantId, context.tenantId),
        manageGuard(context)
      );
      const rows = await db
        .select()
        .from(tenantApiTokenGrantTable)
        .where(where)
        .orderBy(asc(tenantApiTokenGrantTable.id))
        .limit(pageSize)
        .offset((pageNo - 1) * pageSize);
      const [total] = await db
        .select({ total: sql`count(*)`.mapWith(postgresSafeInteger) })
        .from(tenantApiTokenGrantTable)
        .where(where);
      return pageResult(rows, total?.total ?? 0, pageNo, pageSize);
    });
  },
  tokenGrantSet(
    input: TenantTokenGrantSetInput,
    context: TenantContext,
    ownedTokenId: number | null
  ): Promise<number> {
    return withPostgresTransaction(
      async () => {
        const db = getPostgresDb();
        const actorId = humanId(context);
        const tokenPolicy = input.isEnabled
          ? sql`${input.tokenId}::bigint = ${ownedTokenId ?? -1}::bigint
        AND ${registry.system.access.tokenOwnedBySql(input.tokenId, actorId)}
        AND ${registry.system.access.tokenUsableSql(input.tokenId, "enterprise.asset.mapping:read")}`
          : sql`TRUE`;
        const id =
          input.expectedUpdateTimeUtc === null
            ? await insertId(sql`INSERT INTO enterprise_tenant_api_token_grant (tenant_id, token_id, is_enabled, creator_id, updater_id, create_time_utc, update_time_utc)
          SELECT ${context.tenantId}, ${input.tokenId}, ${input.isEnabled}, ${actorId}, NULL, ${now()}, ${now()}
          WHERE ${manageGuard(context)} AND ${input.isEnabled}::boolean AND ${tokenPolicy} AND NOT EXISTS (
            SELECT 1 FROM enterprise_tenant_api_token_grant AS existing_grant WHERE existing_grant.token_id = ${input.tokenId}) RETURNING id`)
            : oneId(
                await db
                  .update(tenantApiTokenGrantTable)
                  .set({
                    isEnabled: input.isEnabled,
                    updaterId: actorId,
                    updateTimeUtc: version(
                      sql`${tenantApiTokenGrantTable.updateTimeUtc}`
                    ),
                  })
                  .where(
                    and(
                      eq(tenantApiTokenGrantTable.tenantId, context.tenantId),
                      eq(tenantApiTokenGrantTable.tokenId, input.tokenId),
                      eq(
                        tenantApiTokenGrantTable.updateTimeUtc,
                        input.expectedUpdateTimeUtc
                      ),
                      manageGuard(context),
                      tokenPolicy
                    )
                  )
                  .returning({ id: tenantApiTokenGrantTable.id })
              );
        await touchTenant(context);
        return id;
      },
      { write: true }
    );
  },
};
