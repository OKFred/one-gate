import { and, eq, isNull, or, sql } from "drizzle-orm";

import db from "@hodor/core/db";
import type { DeviceTaskResultPayload } from "../async-task/domain/task.js";
import {
  DEFAULT_NETWORK_ROUTING_CONFIG,
  type NetworkRoutingConfig,
  type NetworkRoutingStatusEvent,
  type NetworkRoutingTarget,
} from "./domain.js";
import {
  mobileNetworkRoutingTable,
  type MobileNetworkRouting,
} from "./model.js";

export interface NetworkRoutingView extends Omit<
  MobileNetworkRouting,
  "activeTaskClientId" | "lanCidrsJson" | "lanProbeUrlsJson" | "lastResultJson"
> {
  lanCidrs: string[];
  lanProbeUrls: string[];
  lastResult: Record<string, unknown> | null;
}

function affected(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;
  const record = result as Record<string, unknown>;
  if (typeof record.rowsAffected === "number") return record.rowsAffected > 0;
  const meta = record.meta;
  return typeof meta === "object" &&
    meta !== null &&
    typeof (meta as Record<string, unknown>).changes === "number"
    ? Number((meta as Record<string, unknown>).changes) > 0
    : false;
}

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === "string")
  ) {
    throw new Error("Stored routing string array is invalid");
  }
  return parsed;
}

function view(row: MobileNetworkRouting): NetworkRoutingView {
  const {
    activeTaskClientId: _active,
    lanCidrsJson,
    lanProbeUrlsJson,
    lastResultJson,
    ...rest
  } = row;
  const parsedResult: unknown = lastResultJson
    ? JSON.parse(lastResultJson)
    : null;
  return {
    ...rest,
    lanCidrs: parseStringArray(lanCidrsJson),
    lanProbeUrls: parseStringArray(lanProbeUrlsJson),
    lastResult:
      typeof parsedResult === "object" &&
      parsedResult !== null &&
      !Array.isArray(parsedResult)
        ? (parsedResult as Record<string, unknown>)
        : null,
  };
}

/** 每设备网络分流配置及状态的 D1 仓库。 */
export class NetworkRoutingRepository {
  async get(clientId: string): Promise<NetworkRoutingView | undefined> {
    const [row] = await db
      .select()
      .from(mobileNetworkRoutingTable)
      .where(eq(mobileNetworkRoutingTable.clientId, clientId));
    return row ? view(row) : undefined;
  }

  async getOrCreate(
    clientId: string,
    actorId: number
  ): Promise<NetworkRoutingView> {
    await db
      .insert(mobileNetworkRoutingTable)
      .values({
        clientId,
        activeTaskClientId: null,
        policyRevision: 1,
        generation: 0,
        lanCidrsJson: JSON.stringify(DEFAULT_NETWORK_ROUTING_CONFIG.lanCidrs),
        lanProbeUrlsJson: JSON.stringify(
          DEFAULT_NETWORK_ROUTING_CONFIG.lanProbeUrls
        ),
        internetProbeUrl: DEFAULT_NETWORK_ROUTING_CONFIG.internetProbeUrl,
        probeTimeoutMs: DEFAULT_NETWORK_ROUTING_CONFIG.probeTimeoutMs,
        desiredTarget: null,
        actualTarget: null,
        state: "DISABLED",
        creatorId: actorId,
      })
      .onConflictDoNothing({ target: mobileNetworkRoutingTable.clientId });
    const result = await this.get(clientId);
    if (!result) throw new Error("Failed to initialize network routing policy");
    return result;
  }

  async updateConfig(
    clientId: string,
    config: NetworkRoutingConfig,
    actorId: number
  ): Promise<NetworkRoutingView | undefined> {
    const result = await db
      .update(mobileNetworkRoutingTable)
      .set({
        policyRevision: sql`${mobileNetworkRoutingTable.policyRevision} + 1`,
        lanCidrsJson: JSON.stringify(config.lanCidrs),
        lanProbeUrlsJson: JSON.stringify(config.lanProbeUrls),
        internetProbeUrl: config.internetProbeUrl,
        probeTimeoutMs: config.probeTimeoutMs,
        updaterId: actorId,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, clientId),
          isNull(mobileNetworkRoutingTable.activeTaskClientId)
        )
      );
    return affected(result) ? this.get(clientId) : undefined;
  }

  async beginAction(
    clientId: string,
    target: NetworkRoutingTarget | null,
    actorId: number
  ): Promise<NetworkRoutingView | undefined> {
    const result = await db
      .update(mobileNetworkRoutingTable)
      .set({
        activeTaskClientId: clientId,
        generation: sql`${mobileNetworkRoutingTable.generation} + 1`,
        desiredTarget: target,
        state: "APPLYING",
        lastTaskId: null,
        lastErrorCode: null,
        lastResultJson: null,
        updaterId: actorId,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, clientId),
          isNull(mobileNetworkRoutingTable.activeTaskClientId)
        )
      );
    return affected(result) ? this.get(clientId) : undefined;
  }

  async attachTask(
    clientId: string,
    generation: number,
    taskId: string
  ): Promise<void> {
    await db
      .update(mobileNetworkRoutingTable)
      .set({ lastTaskId: taskId, updateTimeUtc: Date.now() })
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, clientId),
          eq(mobileNetworkRoutingTable.generation, generation)
        )
      );
  }

  async failDispatch(
    clientId: string,
    generation: number,
    code: string
  ): Promise<void> {
    await db
      .update(mobileNetworkRoutingTable)
      .set({
        activeTaskClientId: null,
        state: "FAILED",
        lastErrorCode: code,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, clientId),
          eq(mobileNetworkRoutingTable.generation, generation)
        )
      );
  }

  async complete(result: DeviceTaskResultPayload): Promise<void> {
    if (
      typeof result.data !== "object" ||
      result.data === null ||
      Array.isArray(result.data)
    )
      return;
    const data = result.data as Record<string, unknown>;
    const generation = data.generation;
    if (!Number.isInteger(generation)) return;
    const current = await this.get(result.deviceId);
    if (!current || current.generation !== generation) return;

    const isDisable = result.scriptId === "device.network.routing.disable";
    const succeeded = result.status === "SUCCESS";
    const target =
      data.target === "wifi" || data.target === "carrier"
        ? data.target
        : current.desiredTarget;
    await db
      .update(mobileNetworkRoutingTable)
      .set({
        activeTaskClientId: null,
        desiredTarget: isDisable && succeeded ? null : current.desiredTarget,
        actualTarget: succeeded
          ? isDisable
            ? null
            : target
          : current.actualTarget,
        state: succeeded
          ? isDisable
            ? "DISABLED"
            : "ACTIVE"
          : result.code === "NETWORK_ROUTING_ROLLBACK_FAILED"
            ? "ROLLBACK_FAILED"
            : "FAILED",
        lastTaskId: result.taskId,
        lastErrorCode: succeeded ? null : result.code,
        lastResultJson: JSON.stringify(data),
        lastVerifiedTimeUtc: succeeded
          ? result.finishedAt
          : current.lastVerifiedTimeUtc,
        updaterId: 0,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, result.deviceId),
          eq(mobileNetworkRoutingTable.generation, Number(generation))
        )
      );
  }

  /** 仅在 generation 精确匹配时更新设备主动上报的运行状态。 */
  async updateRuntimeStatus(
    event: NetworkRoutingStatusEvent
  ): Promise<boolean> {
    const current = await this.get(event.deviceId);
    if (!current || current.generation !== event.generation) return false;
    const healthy = event.state === "ACTIVE" || event.state === "DISABLED";
    const result = await db
      .update(mobileNetworkRoutingTable)
      .set({
        actualTarget:
          event.state === "DISABLED"
            ? null
            : event.state === "ACTIVE"
              ? event.target
              : current.actualTarget || event.target,
        state: event.state,
        lastErrorCode: healthy ? null : event.code,
        lastVerifiedTimeUtc:
          event.state === "ACTIVE"
            ? (event.verifiedAt ?? event.timestamp)
            : current.lastVerifiedTimeUtc,
        updaterId: 0,
        updateTimeUtc: Date.now(),
      })
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, event.deviceId),
          eq(mobileNetworkRoutingTable.generation, event.generation)
        )
      );
    return affected(result);
  }

  async isPersistentRoutingActive(clientId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: mobileNetworkRoutingTable.id })
      .from(mobileNetworkRoutingTable)
      .where(
        and(
          eq(mobileNetworkRoutingTable.clientId, clientId),
          or(
            sql`${mobileNetworkRoutingTable.actualTarget} is not null`,
            eq(mobileNetworkRoutingTable.state, "APPLYING"),
            eq(mobileNetworkRoutingTable.state, "RECOVERING"),
            eq(mobileNetworkRoutingTable.state, "DEGRADED"),
            eq(mobileNetworkRoutingTable.state, "ROLLBACK_FAILED")
          )
        )
      );
    return Boolean(row);
  }
}

export const networkRoutingRepository = new NetworkRoutingRepository();
