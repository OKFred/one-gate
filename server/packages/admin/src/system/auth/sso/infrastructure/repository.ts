import db from "@hodor/core/db/index";
import {
  and,
  eq,
  gt,
  isNotNull,
  isNull,
  lte,
  or,
  type InferInsertModel,
} from "drizzle-orm";
import { userTable } from "../../../user/model.js";
import type {
  NewSsoBinding,
  SsoBindingCreateResult,
  SsoRepositoryPort,
} from "../application/ports.js";
import {
  SsoError,
  SsoErrorCode,
  type SsoBinding,
  type SsoTransaction,
  type VerifiedSsoPrincipal,
} from "../domain/sso.js";
import { ssoOidcTransactionTable, userSsoIdentityTable } from "../model.js";

type SsoBindingRow = typeof userSsoIdentityTable.$inferSelect;
type SsoTransactionRow = typeof ssoOidcTransactionTable.$inferSelect;

function toBinding(row: SsoBindingRow): SsoBinding {
  return {
    ...row,
    amr: [...row.amr],
    scope: [...row.scope],
  };
}

function toTransaction(row: SsoTransactionRow): SsoTransaction {
  return { ...row };
}

function toBindingInsert(binding: NewSsoBinding) {
  return {
    ...binding,
    amr: [...binding.amr],
    scope: [...binding.scope],
  } satisfies Omit<InferInsertModel<typeof userSsoIdentityTable>, "id">;
}

function toTransactionInsert(transaction: SsoTransaction) {
  return transaction satisfies InferInsertModel<typeof ssoOidcTransactionTable>;
}

export class DrizzleSsoRepository implements SsoRepositoryPort {
  async createTransaction(transaction: SsoTransaction): Promise<void> {
    await db
      .insert(ssoOidcTransactionTable)
      .values(toTransactionInsert(transaction));
  }

  async consumeTransaction(
    input: Parameters<SsoRepositoryPort["consumeTransaction"]>[0]
  ): Promise<SsoTransaction | null> {
    const expectedUserCondition =
      input.expectedUserId === null
        ? isNull(ssoOidcTransactionTable.expectedUserId)
        : eq(ssoOidcTransactionTable.expectedUserId, input.expectedUserId);
    const rows = await db
      .update(ssoOidcTransactionTable)
      .set({ consumedAtUtc: input.consumedAtUtc })
      .where(
        and(
          eq(ssoOidcTransactionTable.stateDigest, input.stateDigest),
          eq(ssoOidcTransactionTable.intent, input.expectedIntent),
          expectedUserCondition,
          isNull(ssoOidcTransactionTable.consumedAtUtc),
          gt(ssoOidcTransactionTable.expiresAtUtc, input.consumedAtUtc)
        )
      )
      .returning();
    return rows[0] ? toTransaction(rows[0]) : null;
  }

  async deleteRetiredTransactions(nowUtc: number): Promise<number> {
    const rows = await db
      .delete(ssoOidcTransactionTable)
      .where(
        or(
          lte(ssoOidcTransactionTable.expiresAtUtc, nowUtc),
          isNotNull(ssoOidcTransactionTable.consumedAtUtc)
        )
      )
      .returning({ id: ssoOidcTransactionTable.id });
    return rows.length;
  }

  async findBindingBySubject(
    issuer: string,
    subject: string
  ): Promise<SsoBinding | null> {
    const rows = await db
      .select()
      .from(userSsoIdentityTable)
      .where(
        and(
          eq(userSsoIdentityTable.issuer, issuer),
          eq(userSsoIdentityTable.subject, subject)
        )
      )
      .limit(1);
    return rows[0] ? toBinding(rows[0]) : null;
  }

  async findBindingByUserAndIssuer(
    userId: number,
    issuer: string
  ): Promise<SsoBinding | null> {
    const rows = await db
      .select()
      .from(userSsoIdentityTable)
      .where(
        and(
          eq(userSsoIdentityTable.userId, userId),
          eq(userSsoIdentityTable.issuer, issuer)
        )
      )
      .limit(1);
    return rows[0] ? toBinding(rows[0]) : null;
  }

  async createBinding(binding: NewSsoBinding): Promise<SsoBindingCreateResult> {
    const user = await this.findLocalUser(binding.userId);
    if (!user || !user.isEnabled) {
      throw new SsoError(
        SsoErrorCode.ACCOUNT_DISABLED,
        "关联的本地账号不存在或已停用"
      );
    }

    try {
      const rows = await db
        .insert(userSsoIdentityTable)
        .values(toBindingInsert(binding))
        .returning({ id: userSsoIdentityTable.id });
      return { outcome: "created", bindingId: rows[0].id };
    } catch (error) {
      const conflict = await this.resolveBindingConflict(binding);
      if (conflict) return conflict;
      throw error;
    }
  }

  async updateBindingVerification(
    bindingId: number,
    principal: VerifiedSsoPrincipal,
    verifiedAtUtc: number
  ): Promise<void> {
    await db
      .update(userSsoIdentityTable)
      .set({
        principalUserId: principal.userId,
        tenantId: principal.tenantId,
        membershipId: principal.membershipId,
        clientId: principal.clientId,
        amr: [...principal.amr],
        scope: [...principal.scope],
        updateTimeUtc: verifiedAtUtc,
      })
      .where(eq(userSsoIdentityTable.id, bindingId));
  }

  async deleteBinding(userId: number, issuer: string): Promise<boolean> {
    const result = await db
      .delete(userSsoIdentityTable)
      .where(
        and(
          eq(userSsoIdentityTable.userId, userId),
          eq(userSsoIdentityTable.issuer, issuer)
        )
      );
    return result.rowsAffected > 0;
  }

  async findLocalUser(userId: number) {
    const rows = await db
      .select({
        id: userTable.id,
        username: userTable.username,
        langCode: userTable.langCode,
        isEnabled: userTable.isEnabled,
      })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async resolveBindingConflict(
    binding: NewSsoBinding
  ): Promise<Exclude<SsoBindingCreateResult, { outcome: "created" }> | null> {
    const bySubject = await this.findBindingBySubject(
      binding.issuer,
      binding.subject
    );
    if (bySubject) return { outcome: "subject_conflict" };

    const byUser = await this.findBindingByUserAndIssuer(
      binding.userId,
      binding.issuer
    );
    return byUser ? { outcome: "user_conflict" } : null;
  }
}

export const drizzleSsoRepository = new DrizzleSsoRepository();
