import { and, desc, eq, lte, sql } from "drizzle-orm";

import db from "@hodor/core/db";
import { mobileDeviceTable } from "../device/model.js";
import type {
  ClientEnvironmentName,
  DeviceDeploymentEvent,
} from "./domain/deployment.js";
import { isTerminalDeploymentPhase } from "./domain/deployment.js";
import {
  mobileClientDeploymentTable,
  mobileClientEnvironmentRevisionTable,
  mobileClientEnvironmentTable,
  mobileClientReleaseTable,
  type MobileClientDeployment,
  type MobileClientEnvironment,
  type MobileClientEnvironmentRevision,
  type MobileClientRelease,
} from "./model.js";

/** 兼容 LibSQL 与 Cloudflare D1 的数据库变更结果。 */
export function didMutationAffectRows(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;
  const record = result as Record<string, unknown>;
  if (typeof record.rowsAffected === "number") {
    return record.rowsAffected > 0;
  }
  const meta = record.meta;
  if (typeof meta !== "object" || meta === null) return false;
  const changes = (meta as Record<string, unknown>).changes;
  return typeof changes === "number" && changes > 0;
}

/** 环境及当前不可变修订读取模型。 */
export interface EnvironmentRevisionView {
  environment: MobileClientEnvironment;
  revision: MobileClientEnvironmentRevision;
  config: Record<string, unknown>;
  requiredSecretKeys: string[];
}

/** 安全解析普通 JSON 对象。 */
function parseRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Stored JSON value is not an object");
  }
  return parsed as Record<string, unknown>;
}

/** 安全解析字符串数组。 */
function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === "string")
  ) {
    throw new Error("Stored JSON value is not a string array");
  }
  return parsed;
}

/** 客户端发布、环境修订和部署持久化仓库。 */
export class ClientDeploymentRepository {
  /** 按版本读取不可变发布。 */
  async getReleaseByVersion(
    releaseVersion: string
  ): Promise<MobileClientRelease | undefined> {
    const [row] = await db
      .select()
      .from(mobileClientReleaseTable)
      .where(eq(mobileClientReleaseTable.releaseVersion, releaseVersion));
    return row;
  }

  /** 按主键读取发布。 */
  async getReleaseById(id: number): Promise<MobileClientRelease | undefined> {
    const [row] = await db
      .select()
      .from(mobileClientReleaseTable)
      .where(eq(mobileClientReleaseTable.id, id));
    return row;
  }

  /** 保存由 CI 完成上传的不可变发布。 */
  async addRelease(input: {
    releaseVersion: string;
    artifactKey: string;
    artifactSha256: string;
    artifactSize: number;
    manifestJson: string;
    releaseNotes: string | null;
    creatorId: number;
  }): Promise<MobileClientRelease> {
    const [row] = await db
      .insert(mobileClientReleaseTable)
      .values({ ...input, status: "PUBLISHED" })
      .returning();
    return row;
  }

  /** 撤销发布的新部署资格。 */
  async revokeRelease(id: number, updaterId: number): Promise<void> {
    await db
      .update(mobileClientReleaseTable)
      .set({
        status: "REVOKED",
        updaterId,
        updateTimeUtc: Date.now(),
      })
      .where(eq(mobileClientReleaseTable.id, id));
  }

  /** 分页列出客户端发布。 */
  async listReleases(params: { pageNo: number; pageSize: number }): Promise<{
    list: MobileClientRelease[];
    total: number;
    totalPage: number;
    currentPage: number;
    pageNo: number;
    pageSize: number;
  }> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileClientReleaseTable);
    const list = await db
      .select()
      .from(mobileClientReleaseTable)
      .orderBy(desc(mobileClientReleaseTable.createTimeUtc))
      .limit(params.pageSize)
      .offset((params.pageNo - 1) * params.pageSize);
    return {
      list,
      total: count,
      totalPage: Math.ceil(count / params.pageSize),
      currentPage: params.pageNo,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    };
  }

  /** 确保三个固定环境名称存在。 */
  async ensureEnvironments(): Promise<void> {
    for (const name of ["development", "staging", "production"] as const) {
      await db
        .insert(mobileClientEnvironmentTable)
        .values({ name, activeRevisionId: null, isEnabled: true, creatorId: 0 })
        .onConflictDoNothing({ target: mobileClientEnvironmentTable.name });
      const environment = await this.getEnvironment(name);
      if (environment && !environment.activeRevisionId) {
        const [revision] = await db
          .insert(mobileClientEnvironmentRevisionTable)
          .values({
            environmentId: environment.id,
            revision: 1,
            configJson: "{}",
            requiredSecretKeysJson: "[]",
            creatorId: 0,
          })
          .onConflictDoNothing()
          .returning();
        const activeRevision =
          revision ||
          (
            await db
              .select()
              .from(mobileClientEnvironmentRevisionTable)
              .where(
                and(
                  eq(
                    mobileClientEnvironmentRevisionTable.environmentId,
                    environment.id
                  ),
                  eq(mobileClientEnvironmentRevisionTable.revision, 1)
                )
              )
          )[0];
        if (activeRevision) {
          await db
            .update(mobileClientEnvironmentTable)
            .set({ activeRevisionId: activeRevision.id, updaterId: 0 })
            .where(eq(mobileClientEnvironmentTable.id, environment.id));
        }
      }
    }
  }

  /** 按名称读取环境。 */
  async getEnvironment(
    name: ClientEnvironmentName
  ): Promise<MobileClientEnvironment | undefined> {
    const [row] = await db
      .select()
      .from(mobileClientEnvironmentTable)
      .where(eq(mobileClientEnvironmentTable.name, name));
    return row;
  }

  /** 读取环境指定修订。 */
  async getEnvironmentRevision(
    environmentId: number,
    revision: number
  ): Promise<EnvironmentRevisionView | undefined> {
    const [row] = await db
      .select({
        environment: mobileClientEnvironmentTable,
        revision: mobileClientEnvironmentRevisionTable,
      })
      .from(mobileClientEnvironmentTable)
      .innerJoin(
        mobileClientEnvironmentRevisionTable,
        eq(
          mobileClientEnvironmentRevisionTable.environmentId,
          mobileClientEnvironmentTable.id
        )
      )
      .where(
        and(
          eq(mobileClientEnvironmentTable.id, environmentId),
          eq(mobileClientEnvironmentRevisionTable.revision, revision)
        )
      );
    if (!row) return undefined;
    return {
      ...row,
      config: parseRecord(row.revision.configJson),
      requiredSecretKeys: parseStringArray(row.revision.requiredSecretKeysJson),
    };
  }

  /** 读取环境当前修订。 */
  async getActiveEnvironmentRevision(
    name: ClientEnvironmentName
  ): Promise<EnvironmentRevisionView | undefined> {
    const environment = await this.getEnvironment(name);
    if (!environment?.activeRevisionId) return undefined;
    const [revision] = await db
      .select()
      .from(mobileClientEnvironmentRevisionTable)
      .where(
        eq(
          mobileClientEnvironmentRevisionTable.id,
          environment.activeRevisionId
        )
      );
    if (!revision) return undefined;
    return {
      environment,
      revision,
      config: parseRecord(revision.configJson),
      requiredSecretKeys: parseStringArray(revision.requiredSecretKeysJson),
    };
  }

  /** 列出三个环境的当前修订。 */
  async listEnvironmentRevisions(): Promise<EnvironmentRevisionView[]> {
    const result: EnvironmentRevisionView[] = [];
    for (const name of ["development", "staging", "production"] as const) {
      const view = await this.getActiveEnvironmentRevision(name);
      if (view) result.push(view);
    }
    return result;
  }

  /** 新建不可变环境修订并原子设为当前。 */
  async addEnvironmentRevision(input: {
    name: ClientEnvironmentName;
    configJson: string;
    requiredSecretKeysJson: string;
    creatorId: number;
  }): Promise<EnvironmentRevisionView> {
    await this.ensureEnvironments();
    const environment = await this.getEnvironment(input.name);
    if (!environment) throw new Error("Environment initialization failed");
    const [{ maximum }] = await db
      .select({
        maximum: sql<number>`coalesce(max(${mobileClientEnvironmentRevisionTable.revision}), 0)`,
      })
      .from(mobileClientEnvironmentRevisionTable)
      .where(
        eq(mobileClientEnvironmentRevisionTable.environmentId, environment.id)
      );
    const revisionNumber = maximum + 1;
    const [revision] = await db
      .insert(mobileClientEnvironmentRevisionTable)
      .values({
        environmentId: environment.id,
        revision: revisionNumber,
        configJson: input.configJson,
        requiredSecretKeysJson: input.requiredSecretKeysJson,
        creatorId: input.creatorId,
      })
      .returning();
    await db
      .update(mobileClientEnvironmentTable)
      .set({
        activeRevisionId: revision.id,
        updaterId: input.creatorId,
        updateTimeUtc: Date.now(),
      })
      .where(eq(mobileClientEnvironmentTable.id, environment.id));
    return {
      environment: { ...environment, activeRevisionId: revision.id },
      revision,
      config: parseRecord(revision.configJson),
      requiredSecretKeys: parseStringArray(revision.requiredSecretKeysJson),
    };
  }

  /** 读取部署目标设备及其当前上报。 */
  async getDevice(clientId: string): Promise<
    | {
        isEnabled: boolean;
        reportedExtraJson: string | null;
      }
    | undefined
  > {
    const [row] = await db
      .select({
        isEnabled: mobileDeviceTable.isEnabled,
        reportedExtraJson: mobileDeviceTable.reportedExtraJson,
      })
      .from(mobileDeviceTable)
      .where(eq(mobileDeviceTable.clientId, clientId));
    return row;
  }

  /** 新建单设备互斥部署。 */
  async addDeployment(
    input: Omit<
      typeof mobileClientDeploymentTable.$inferInsert,
      "id" | "createTimeUtc" | "updateTimeUtc" | "updaterId"
    >
  ): Promise<MobileClientDeployment> {
    const [row] = await db
      .insert(mobileClientDeploymentTable)
      .values(input)
      .returning();
    return row;
  }

  /** 按业务标识读取部署。 */
  async getDeployment(
    deploymentId: string
  ): Promise<MobileClientDeployment | undefined> {
    const [row] = await db
      .select()
      .from(mobileClientDeploymentTable)
      .where(eq(mobileClientDeploymentTable.deploymentId, deploymentId));
    return row;
  }

  /** 读取设备当前唯一未终结部署。 */
  async getActiveDeploymentByClientId(
    clientId: string
  ): Promise<MobileClientDeployment | undefined> {
    const [row] = await db
      .select()
      .from(mobileClientDeploymentTable)
      .where(eq(mobileClientDeploymentTable.activeClientId, clientId));
    return row;
  }

  /** 应用经过领域校验的设备部署事件。 */
  async applyDeploymentEvent(
    current: MobileClientDeployment,
    event: DeviceDeploymentEvent
  ): Promise<boolean> {
    const terminal = isTerminalDeploymentPhase(event.phase);
    const result = await db
      .update(mobileClientDeploymentTable)
      .set({
        phase: event.phase,
        activeClientId: terminal ? null : current.clientId,
        resultCode: event.code,
        resultMessage: event.message,
        startedAtUtc: current.startedAtUtc ?? Date.now(),
        finishedAtUtc: terminal ? Date.now() : null,
        updaterId: 0,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(mobileClientDeploymentTable.id, current.id),
          eq(mobileClientDeploymentTable.phase, current.phase)
        )
      );
    return didMutationAffectRows(result);
  }

  /** 将 MQTT 发布失败的部署置为失败。 */
  async failDeployment(
    id: number,
    code: string,
    message: string
  ): Promise<void> {
    await db
      .update(mobileClientDeploymentTable)
      .set({
        phase: "FAILED",
        activeClientId: null,
        resultCode: code,
        resultMessage: message,
        finishedAtUtc: Date.now(),
        updaterId: 0,
        updateTimeUtc: Date.now(),
      })
      .where(eq(mobileClientDeploymentTable.id, id));
  }

  /** 将超过服务端期限且仍在执行的部署置为超时。 */
  async timeoutExpiredDeployments(now: number): Promise<void> {
    await db
      .update(mobileClientDeploymentTable)
      .set({
        phase: "TIMED_OUT",
        activeClientId: null,
        resultCode: "SERVER_DEPLOYMENT_TIMEOUT",
        resultMessage: "部署在服务端期限内未完成",
        finishedAtUtc: now,
        updaterId: 0,
        updateTimeUtc: now,
      })
      .where(
        and(
          lte(mobileClientDeploymentTable.expiresAtUtc, now),
          sql`${mobileClientDeploymentTable.activeClientId} is not null`
        )
      );
  }

  /** 分页列出部署记录。 */
  async listDeployments(params: {
    pageNo: number;
    pageSize: number;
    clientId?: string;
  }): Promise<{
    list: MobileClientDeployment[];
    total: number;
    totalPage: number;
    currentPage: number;
    pageNo: number;
    pageSize: number;
  }> {
    const where = params.clientId
      ? eq(mobileClientDeploymentTable.clientId, params.clientId)
      : undefined;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mobileClientDeploymentTable)
      .where(where);
    const list = await db
      .select()
      .from(mobileClientDeploymentTable)
      .where(where)
      .orderBy(desc(mobileClientDeploymentTable.createTimeUtc))
      .limit(params.pageSize)
      .offset((params.pageNo - 1) * params.pageSize);
    return {
      list,
      total: count,
      totalPage: Math.ceil(count / params.pageSize),
      currentPage: params.pageNo,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    };
  }
}

export const clientDeploymentRepository = new ClientDeploymentRepository();
