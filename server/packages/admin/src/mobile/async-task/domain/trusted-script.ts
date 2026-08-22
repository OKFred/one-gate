import { MOBILE_TASK_PRIORITIES, type MobileTaskPriority } from "./task.js";
import { normalizeNetworkRoutingConfig } from "../../network-routing/domain.js";

/** 服务端与手机客户端共同支持的可信脚本标识。 */
export const MOBILE_TRUSTED_SCRIPT_IDS = [
  "device.apps.list",
  "app.install",
  "app.version.check",
  "app.update.store",
  "app.update.zip",
  "file.download",
  "tiktok.post",
  "device.network.switch",
  "device.network.routing.apply",
  "device.network.routing.disable",
] as const;
export type TrustedScriptId = (typeof MOBILE_TRUSTED_SCRIPT_IDS)[number];

/** 判断未知脚本标识是否位于服务端可信目录。 */
export function isTrustedScriptId(value: string): value is TrustedScriptId {
  return (MOBILE_TRUSTED_SCRIPT_IDS as readonly string[]).includes(value);
}

/** 可信脚本的版本与执行超时约束。 */
export interface TrustedScriptDefinition {
  version: number;
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
}

/** 服务端允许调度的手机可信脚本目录。 */
export const TRUSTED_SCRIPT_CATALOG = {
  "device.apps.list": {
    version: 1,
    defaultTimeoutMs: 120_000,
    maxTimeoutMs: 300_000,
  },
  "app.install": {
    version: 1,
    defaultTimeoutMs: 300_000,
    maxTimeoutMs: 900_000,
  },
  "app.version.check": {
    version: 1,
    defaultTimeoutMs: 60_000,
    maxTimeoutMs: 120_000,
  },
  "app.update.store": {
    version: 1,
    defaultTimeoutMs: 120_000,
    maxTimeoutMs: 300_000,
  },
  "app.update.zip": {
    version: 1,
    defaultTimeoutMs: 600_000,
    maxTimeoutMs: 900_000,
  },
  "file.download": {
    version: 1,
    defaultTimeoutMs: 300_000,
    maxTimeoutMs: 900_000,
  },
  "tiktok.post": {
    version: 1,
    defaultTimeoutMs: 420_000,
    maxTimeoutMs: 900_000,
  },
  "device.network.switch": {
    version: 1,
    defaultTimeoutMs: 60_000,
    maxTimeoutMs: 150_000,
  },
  "device.network.routing.apply": {
    version: 1,
    defaultTimeoutMs: 120_000,
    maxTimeoutMs: 300_000,
  },
  "device.network.routing.disable": {
    version: 1,
    defaultTimeoutMs: 60_000,
    maxTimeoutMs: 120_000,
  },
} as const satisfies Record<TrustedScriptId, TrustedScriptDefinition>;

/** 可映射为业务错误的设备任务领域规则异常。 */
export class DeviceTaskRuleViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceTaskRuleViolation";
  }
}

/** 领域规则归一化后的可信任务参数。 */
export interface PreparedTrustedTask {
  definition: TrustedScriptDefinition;
  paramsJson: string;
  priority: MobileTaskPriority;
  preemptRunning: boolean;
  timeoutMs: number;
  callbackUrl?: string;
}

/** 校验 MQTT Topic 使用的设备标识。 */
export function validateDeviceClientId(clientId: string): void {
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(clientId)) {
    throw new DeviceTaskRuleViolation("设备标识包含 MQTT Topic 不支持的字符");
  }
}

/** 对具有安全边界的脚本参数执行服务端前置校验。 */
export function validateTrustedScriptParams(
  scriptId: TrustedScriptId,
  params: Record<string, unknown>
): void {
  const requireString = (key: string): string => {
    const value = params[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new DeviceTaskRuleViolation(
        `${scriptId} 必须提供字符串参数 ${key}`
      );
    }
    return value;
  };
  const requireUrl = (key: string): URL => {
    try {
      return new URL(requireString(key));
    } catch {
      throw new DeviceTaskRuleViolation(`${scriptId} 的 ${key} 不是有效 URL`);
    }
  };

  if (scriptId === "app.install" || scriptId === "app.update.zip") {
    const downloadUrl = requireUrl("downloadUrl");
    if (downloadUrl.protocol !== "https:") {
      throw new DeviceTaskRuleViolation(`${scriptId} 仅允许 HTTPS 下载地址`);
    }
  }
  if (scriptId === "device.apps.list") {
    const appType = params.type;
    if (
      appType !== undefined &&
      appType !== "all" &&
      appType !== "third" &&
      appType !== "system"
    ) {
      throw new DeviceTaskRuleViolation(
        "device.apps.list 的 type 仅支持 all/third/system"
      );
    }
  }
  if (scriptId === "file.download") {
    const downloadUrl = requireUrl("downloadUrl");
    if (downloadUrl.protocol !== "https:" && downloadUrl.protocol !== "http:") {
      throw new DeviceTaskRuleViolation(
        "file.download 仅允许 HTTP/HTTPS 下载地址"
      );
    }
    if (!requireString("targetPath").startsWith("/sdcard/")) {
      throw new DeviceTaskRuleViolation(
        "file.download 的 targetPath 必须位于 /sdcard/"
      );
    }
  }
  if (scriptId === "app.update.store") {
    const packageName = requireString("packageName");
    const storePackage = params.storePackage;
    if (
      !/^[A-Za-z0-9._]+$/.test(packageName) ||
      (typeof storePackage === "string" &&
        storePackage.length > 0 &&
        !/^[A-Za-z0-9._]+$/.test(storePackage))
    ) {
      throw new DeviceTaskRuleViolation("应用包名格式无效");
    }
  }
  if (scriptId === "device.network.switch") {
    const target = requireString("target").toLowerCase();
    if (target !== "wifi" && target !== "ethernet" && target !== "carrier") {
      throw new DeviceTaskRuleViolation(
        "device.network.switch 的 target 仅支持 wifi/ethernet/carrier"
      );
    }
    const detectionTimeoutMs = params.timeoutMs;
    if (
      detectionTimeoutMs !== undefined &&
      (typeof detectionTimeoutMs !== "number" ||
        !Number.isFinite(detectionTimeoutMs) ||
        detectionTimeoutMs < 1000 ||
        detectionTimeoutMs > 120_000)
    ) {
      throw new DeviceTaskRuleViolation(
        "device.network.switch 的 timeoutMs 必须介于1000到120000"
      );
    }
  }
  if (scriptId === "device.network.routing.apply") {
    if (!Number.isInteger(params.generation) || Number(params.generation) < 1) {
      throw new DeviceTaskRuleViolation(
        "network routing generation 必须是正整数"
      );
    }
    if (
      !Number.isInteger(params.policyRevision) ||
      Number(params.policyRevision) < 1
    ) {
      throw new DeviceTaskRuleViolation(
        "network routing policyRevision 必须是正整数"
      );
    }
    if (
      params.internetTarget !== "wifi" &&
      params.internetTarget !== "carrier"
    ) {
      throw new DeviceTaskRuleViolation(
        "network routing internetTarget 仅支持 wifi/carrier"
      );
    }
    try {
      normalizeNetworkRoutingConfig({
        lanCidrs: params.lanCidrs as string[],
        lanProbeUrls: params.lanProbeUrls as string[],
        internetProbeUrl: params.internetProbeUrl as string,
        probeTimeoutMs: params.probeTimeoutMs as number,
      });
    } catch (error) {
      throw new DeviceTaskRuleViolation(
        error instanceof Error ? error.message : "network routing 参数无效"
      );
    }
  }
  if (
    scriptId === "device.network.routing.disable" &&
    (!Number.isInteger(params.generation) || Number(params.generation) < 1)
  ) {
    throw new DeviceTaskRuleViolation(
      "network routing generation 必须是正整数"
    );
  }
}

/** 返回脚本未显式指定时的调度优先级。 */
export function defaultTaskPriority(
  scriptId: TrustedScriptId
): MobileTaskPriority {
  return scriptId === "device.network.switch" ||
    scriptId.startsWith("device.network.routing.")
    ? "HIGH"
    : "NORMAL";
}

/** 计算受脚本策略约束的设备执行超时。 */
export function calculateTaskTimeoutMs(
  scriptId: TrustedScriptId,
  params: Record<string, unknown>,
  requestedTimeoutMs?: number
): number {
  const definition = TRUSTED_SCRIPT_CATALOG[scriptId];
  if (
    requestedTimeoutMs !== undefined &&
    !Number.isFinite(requestedTimeoutMs)
  ) {
    throw new DeviceTaskRuleViolation("任务超时必须是有限数值");
  }
  const requested = Math.max(
    1000,
    Math.min(
      requestedTimeoutMs ?? definition.defaultTimeoutMs,
      definition.maxTimeoutMs
    )
  );
  const detectionTimeoutMs =
    scriptId === "device.network.switch" && typeof params.timeoutMs === "number"
      ? params.timeoutMs
      : 20_000;
  return scriptId === "device.network.switch"
    ? Math.min(
        definition.maxTimeoutMs,
        Math.max(requested, detectionTimeoutMs + 20_000)
      )
    : requested;
}

/** 校验并归一化一条可信脚本任务。 */
export function prepareTrustedTask(input: {
  scriptId: TrustedScriptId;
  params: Record<string, unknown>;
  timeoutMs?: number;
  priority?: MobileTaskPriority;
  preemptRunning?: boolean;
  callbackUrl?: string;
}): PreparedTrustedTask {
  const definition = TRUSTED_SCRIPT_CATALOG[input.scriptId];
  validateTrustedScriptParams(input.scriptId, input.params);
  const priority = input.priority ?? defaultTaskPriority(input.scriptId);
  if (!MOBILE_TASK_PRIORITIES.includes(priority)) {
    throw new DeviceTaskRuleViolation("任务优先级仅支持 LOW/NORMAL/HIGH");
  }
  const paramsJson = JSON.stringify(input.params);
  if (new TextEncoder().encode(paramsJson).byteLength > 65_536) {
    throw new DeviceTaskRuleViolation("任务参数不能超过 65536 字节");
  }

  let callbackUrl: string | undefined;
  if (input.callbackUrl) {
    const parsedCallbackUrl = new URL(input.callbackUrl);
    if (parsedCallbackUrl.protocol !== "https:") {
      throw new DeviceTaskRuleViolation("任务回调地址仅支持 HTTPS");
    }
    callbackUrl = parsedCallbackUrl.toString();
  }

  return {
    definition,
    paramsJson,
    priority,
    preemptRunning: input.preemptRunning ?? false,
    timeoutMs: calculateTaskTimeoutMs(
      input.scriptId,
      input.params,
      input.timeoutMs
    ),
    ...(callbackUrl ? { callbackUrl } : {}),
  };
}

/** 裁剪服务端等待设备结果的宽限时间。 */
export function normalizeResultGraceMs(value: unknown): number {
  const configured = Number(value || 30_000);
  return Number.isFinite(configured)
    ? Math.max(0, Math.min(300_000, Math.trunc(configured)))
    : 30_000;
}
