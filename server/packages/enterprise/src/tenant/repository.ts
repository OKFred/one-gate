import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { registry } from "@hodor/admin/common/registry";
import type { AuthPrincipal } from "@hodor/core/types/app";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import {
  tenantTable,
  tenantMemberTable,
  tenantApiTokenGrantTable,
  type TenantRole,
  type TenantListInput,
  type TenantCreateInput,
  type TenantUpdateInput,
  type TenantChildrenListInput,
  type TenantMemberSetInput,
  type TenantOwnerTransferInput,
  type TenantOwnerRecoverInput,
  type TenantTokenGrantSetInput,
} from "./model";
import { activeOwnerExists, tenantGuard, type TenantContext } from "./context";
import { TenantError, isTenantBatchConflict, tenantConflict } from "./errors";

type Human = Extract<AuthPrincipal, { kind: "user" }>;
const now = getCurrentTimestampUtcSql;
const version = (column: SQL) => sql<number>`MAX(${now()}, ${column} + 1)`;

/** An explicit database error rolls back the whole driver batch, including a preceding successful write. */
function assertOne() {
  return db
    .select({
      assertion: sql<string>`json(CASE WHEN changes() = 1 THEN '{}' ELSE 'tenant_write_conflict' END)`,
    })
    .from(sql`(SELECT 1)`);
}

async function checked<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (isTenantBatchConflict(error, true)) tenantConflict();
    throw error;
  }
}

function manageGuard(context: TenantContext): SQL {
  return tenantGuard({ ...context, capability: "manage" });
}
function humanId(context: TenantContext): number {
  if (context.principal.kind !== "user")
    throw new BusinessError(TenantError.HUMAN_REQUIRED);
  return context.principal.userId;
}
function ownerGuard(context: TenantContext): SQL {
  const actorId = humanId(context);
  return sql`${manageGuard(context)} AND EXISTS (SELECT 1 FROM enterprise_tenant_member AS acting_owner
    WHERE acting_owner.tenant_id = ${context.tenantId} AND acting_owner.user_id = ${actorId}
      AND acting_owner.is_enabled = 1 AND acting_owner.role = 'owner')`;
}
function touchTenant(context: TenantContext) {
  return db
    .update(tenantTable)
    .set({
      updaterId: humanId(context),
      updateTimeUtc: version(sql`${tenantTable.updateTimeUtc}`),
    })
    .where(
      and(
        eq(tenantTable.id, context.tenantId),
        eq(tenantTable.isEnabled, true),
        registry.system.access.userActiveSql(humanId(context)),
        sql`changes() = 1`
      )
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

export const tenantRepository = {
  async canManagePlatform(principal: Human): Promise<boolean> {
    const [allowed] = await db.all<{ allowed: number }>(
      sql`SELECT 1 AS allowed WHERE ${registry.system.access.platformAdminSql(principal.userId)} LIMIT 1`
    );
    return !!allowed;
  },

  async list(input: TenantListInput, principal: Human, platform = false) {
    const { pageNo, pageSize } = pagination(input);
    const callerMembership = sql`EXISTS (SELECT 1 FROM enterprise_tenant_member AS own_membership
      WHERE own_membership.tenant_id = ${tenantTable.id} AND own_membership.user_id = ${principal.userId}
        AND own_membership.is_enabled = 1)`;
    const guard = platform
      ? registry.system.access.platformAdminSql(principal.userId)
      : sql`${registry.system.access.userActiveSql(principal.userId)} AND ${callerMembership}`;
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
        memberRole: sql<TenantRole | null>`(SELECT visible_member.role FROM enterprise_tenant_member AS visible_member
        WHERE visible_member.tenant_id = ${tenantTable.id} AND visible_member.user_id = ${principal.userId}
          AND visible_member.is_enabled = 1 LIMIT 1)`,
        frozen:
          sql`(${tenantTable.isEnabled} = 0 OR NOT ${activeOwnerExists(sql`${tenantTable.id}`)})`.mapWith(
            Boolean
          ),
      })
      .from(tenantTable)
      .where(where)
      .orderBy(input.descend === false ? asc(sort) : desc(sort))
      .limit(pageSize)
      .offset((pageNo - 1) * pageSize);
    const [count] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(tenantTable)
      .where(where);
    return {
      ...pageResult(rows, count?.total ?? 0, pageNo, pageSize),
      canManagePlatform: await this.canManagePlatform(principal),
    };
  },

  async create(input: TenantCreateInput, actor: Human): Promise<number> {
    return checked(async () => {
      try {
        const [created] = await db.batch([
          db
            .insert(tenantTable)
            .select(
              sql`SELECT NULL, ${input.key}, ${input.name}, 1, NULL,
            ${actor.userId}, NULL, ${now()}, ${now()}
            WHERE ${registry.system.access.platformAdminSql(actor.userId)}
              AND ${registry.system.access.userActiveSql(input.ownerUserId)}`
            )
            .returning({ id: tenantTable.id }),
          assertOne(),
          db.insert(tenantMemberTable)
            .select(sql`SELECT NULL, created.id, ${input.ownerUserId}, 'owner', 1,
            ${actor.userId}, NULL, ${now()}, ${now()}
            FROM enterprise_tenant AS created WHERE created.key = ${input.key}
              AND created.creator_id = ${actor.userId} AND changes() = 1
              AND ${registry.system.access.userActiveSql(input.ownerUserId)}
              AND ${registry.system.access.platformAdminSql(actor.userId)}`),
          assertOne(),
        ]);
        return created[0]?.id ?? tenantConflict();
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          /enterprise_tenant\.key|enterprise_tenant_key_unique/.test(
            error.message
          )
        )
          throw new BusinessError(TenantError.KEY_CONFLICT);
        throw error;
      }
    });
  },

  async update(input: TenantUpdateInput, actor: Human): Promise<number> {
    const [updated] = await db
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
      .returning({ id: tenantTable.id });
    return updated?.id ?? tenantConflict();
  },

  async members(input: TenantChildrenListInput, context: TenantContext) {
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
    const [count] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(tenantMemberTable)
      .where(where);
    return pageResult(rows, count?.total ?? 0, pageNo, pageSize);
  },

  async member(input: { userId: number }, context: TenantContext) {
    const [member] = await db
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
  },

  async memberSet(
    input: TenantMemberSetInput,
    context: TenantContext
  ): Promise<number> {
    const actorId = humanId(context);
    const actorOwner = ownerGuard(context);
    const targetPolicy =
      input.role === "owner" ? actorOwner : manageGuard(context);
    return checked(async () => {
      const operation =
        input.expectedUpdateTimeUtc === null
          ? db
              .insert(tenantMemberTable)
              .select(
                sql`SELECT NULL, ${context.tenantId}, ${input.userId}, ${input.role}, ${input.isEnabled ? 1 : 0},
            ${actorId}, NULL, ${now()}, ${now()}
            WHERE ${targetPolicy} AND ${registry.system.access.userActiveSql(input.userId)}
              AND NOT EXISTS (SELECT 1 FROM enterprise_tenant_member AS existing_member
                WHERE existing_member.tenant_id = ${context.tenantId} AND existing_member.user_id = ${input.userId})`
              )
              .returning({ id: tenantMemberTable.id })
          : db
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
                    ? sql`(${tenantMemberTable.role} != 'owner' OR ${tenantMemberTable.isEnabled} = 0
                  OR NOT ${registry.system.access.userActiveSql(input.userId)}
                  OR ${activeOwnerExists(context.tenantId, input.userId)})`
                    : undefined
                )
              )
              .returning({ id: tenantMemberTable.id });
      const [changed] = await db.batch([
        operation,
        assertOne(),
        touchTenant(context),
        assertOne(),
      ]);
      return changed[0]?.id ?? tenantConflict();
    });
  },

  async transferOwner(
    input: TenantOwnerTransferInput,
    context: TenantContext
  ): Promise<number> {
    const actorId = humanId(context);
    if (actorId === input.toUserId) tenantConflict();
    return checked(async () => {
      await db.batch([
        db
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
              eq(tenantMemberTable.updateTimeUtc, input.expectedTargetTimeUtc),
              eq(tenantMemberTable.isEnabled, true),
              ownerGuard(context),
              registry.system.access.userActiveSql(input.toUserId),
              sql`EXISTS (SELECT 1 FROM enterprise_tenant_member AS original_owner
              WHERE original_owner.tenant_id = ${context.tenantId} AND original_owner.user_id = ${actorId}
                AND original_owner.role = 'owner' AND original_owner.is_enabled = 1
                AND original_owner.update_time_utc = ${input.expectedSourceTimeUtc})`
            )
          ),
        assertOne(),
        db
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
              eq(tenantMemberTable.updateTimeUtc, input.expectedSourceTimeUtc),
              ownerGuard(context),
              activeOwnerExists(context.tenantId, actorId),
              sql`changes() = 1`
            )
          ),
        assertOne(),
        touchTenant(context),
        assertOne(),
      ]);
      return context.tenantId;
    });
  },

  async recoverOwner(
    input: TenantOwnerRecoverInput,
    actor: Human
  ): Promise<number> {
    return checked(async () => {
      const [changed] = await db.batch([
        db
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
          .returning({ id: tenantTable.id }),
        assertOne(),
        db
          .insert(tenantMemberTable)
          .select(
            sql`SELECT NULL, ${input.tenantId}, ${input.userId}, 'owner', 1,
          ${actor.userId}, NULL, ${now()}, ${now()}
          WHERE changes() = 1 AND ${registry.system.access.platformAdminSql(actor.userId)}
            AND ${registry.system.access.userActiveSql(input.userId)}`
          )
          .onConflictDoUpdate({
            target: [tenantMemberTable.tenantId, tenantMemberTable.userId],
            set: {
              role: "owner",
              isEnabled: true,
              updaterId: actor.userId,
              updateTimeUtc: version(sql`${tenantMemberTable.updateTimeUtc}`),
            },
          }),
        assertOne(),
      ]);
      return changed[0]?.id ?? tenantConflict();
    });
  },

  async tokenGrants(input: TenantChildrenListInput, context: TenantContext) {
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
    const [count] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(tenantApiTokenGrantTable)
      .where(where);
    return pageResult(rows, count?.total ?? 0, pageNo, pageSize);
  },

  async tokenGrantSet(
    input: TenantTokenGrantSetInput,
    context: TenantContext,
    ownedTokenId: number | null
  ): Promise<number> {
    const actorId = humanId(context);
    const tokenPolicy = input.isEnabled
      ? sql`${input.tokenId} = ${ownedTokenId ?? -1}
          AND ${registry.system.access.tokenOwnedBySql(input.tokenId, actorId)}
          AND ${registry.system.access.tokenUsableSql(input.tokenId, "enterprise.asset.mapping:read")}`
      : sql`1`;
    return checked(async () => {
      const operation =
        input.expectedUpdateTimeUtc === null
          ? db
              .insert(tenantApiTokenGrantTable)
              .select(
                sql`SELECT NULL, ${context.tenantId}, ${input.tokenId}, ${input.isEnabled ? 1 : 0},
            ${actorId}, NULL, ${now()}, ${now()}
            WHERE ${manageGuard(context)} AND ${input.isEnabled ? 1 : 0} = 1 AND ${tokenPolicy}
              AND NOT EXISTS (SELECT 1 FROM enterprise_tenant_api_token_grant AS existing_grant WHERE existing_grant.token_id = ${input.tokenId})`
              )
              .returning({ id: tenantApiTokenGrantTable.id })
          : db
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
              .returning({ id: tenantApiTokenGrantTable.id });
      const [changed] = await db.batch([
        operation,
        assertOne(),
        touchTenant(context),
        assertOne(),
      ]);
      return changed[0]?.id ?? tenantConflict();
    });
  },
};
