/** 客户端部署切换模式。 */
export const CLIENT_DEPLOYMENT_ACTIVATION_MODES = [
  "GRACEFUL",
  "FORCE",
] as const;
export type ClientDeploymentActivationMode =
  (typeof CLIENT_DEPLOYMENT_ACTIVATION_MODES)[number];

/** 客户端部署阶段。 */
export const CLIENT_DEPLOYMENT_PHASES = [
  "PENDING",
  "STAGING",
  "DRAINING",
  "PREEMPTING",
  "ACTIVATING",
  "VERIFYING",
  "SUCCEEDED",
  "FAILED",
  "ROLLED_BACK",
  "TIMED_OUT",
  "CANCELLED",
] as const;
export type ClientDeploymentPhase = (typeof CLIENT_DEPLOYMENT_PHASES)[number];

/** 客户端部署终态。 */
export const CLIENT_DEPLOYMENT_TERMINAL_PHASES = [
  "SUCCEEDED",
  "FAILED",
  "ROLLED_BACK",
  "TIMED_OUT",
  "CANCELLED",
] as const satisfies readonly ClientDeploymentPhase[];

/** 固定支持的环境。 */
export const CLIENT_ENVIRONMENT_NAMES = [
  "development",
  "staging",
  "production",
] as const;
export type ClientEnvironmentName = (typeof CLIENT_ENVIRONMENT_NAMES)[number];

/** 手机端部署进度事件。 */
export interface DeviceDeploymentEvent {
  protocolVersion: 1;
  deploymentId: string;
  deviceId: string;
  phase: ClientDeploymentPhase;
  code: string;
  message: string;
  releaseVersion: string;
  environment: ClientEnvironmentName;
  environmentRevision: number;
  timestamp: number;
}

/** Node Server 下发的部署命令。 */
export interface DeviceDeploymentCommand {
  protocolVersion: 1;
  deploymentId: string;
  deviceId: string;
  release: {
    version: string;
    artifactUrl: string;
    artifactSha256: string;
    artifactSize: number;
  };
  environment: {
    name: ClientEnvironmentName;
    revision: number;
    config: Record<string, unknown>;
    requiredSecretKeys: string[];
  };
  activationMode: ClientDeploymentActivationMode;
  drainTimeoutMs: number;
  createdAt: number;
  expiresAt: number;
}

/** 部署状态转换规则异常。 */
export class ClientDeploymentRuleViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientDeploymentRuleViolation";
  }
}

/** 判断未知值是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 判断部署阶段是否为终态。 */
export function isTerminalDeploymentPhase(
  phase: ClientDeploymentPhase
): boolean {
  return (CLIENT_DEPLOYMENT_TERMINAL_PHASES as readonly string[]).includes(
    phase
  );
}

/** 校验不可变发布版本。 */
export function assertReleaseVersion(value: string): void {
  if (
    !/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(
      value
    )
  ) {
    throw new ClientDeploymentRuleViolation("客户端版本必须为 vX.Y.Z");
  }
}

/** 校验环境模板不包含管理通道或敏感字段。 */
export function assertEnvironmentConfig(value: Record<string, unknown>): void {
  for (const key of ["deviceId", "mqtt", "report"]) {
    if (Object.hasOwn(value, key)) {
      throw new ClientDeploymentRuleViolation(
        `环境模板不能覆盖管理字段 ${key}`
      );
    }
  }
  const visit = (candidate: unknown, depth: number): void => {
    if (depth > 8) {
      throw new ClientDeploymentRuleViolation("环境模板嵌套层级不能超过8层");
    }
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (!isRecord(candidate)) return;
    for (const [key, child] of Object.entries(candidate)) {
      if (/(password|token|secret|credential)/i.test(key)) {
        throw new ClientDeploymentRuleViolation(`环境模板包含敏感字段 ${key}`);
      }
      visit(child, depth + 1);
    }
  };
  visit(value, 0);
}

/** 校验环境声明的设备本地密钥键。 */
export function normalizeRequiredSecretKeys(value: string[]): string[] {
  const managementKeys = new Set([
    "EMQX_PROTOCOL",
    "EMQX_USERNAME",
    "EMQX_PASSWORD",
    "EMQX_HOST",
    "EMQX_PORT",
    "AUTOJS6_REPORT_URL",
    "AUTOJS6_REPORT_TOKEN",
  ]);
  if (
    value.length > 100 ||
    value.some(
      (key) => !/^[A-Z][A-Z0-9_]{0,99}$/.test(key) || managementKeys.has(key)
    )
  ) {
    throw new ClientDeploymentRuleViolation("环境本地密钥声明无效");
  }
  return [...new Set(value)].sort();
}

/** 解析 MQTT 部署事件。 */
export function parseDeviceDeploymentEvent(
  value: unknown
): DeviceDeploymentEvent | null {
  if (
    !isRecord(value) ||
    value.protocolVersion !== 1 ||
    typeof value.deploymentId !== "string" ||
    !/^[0-9a-fA-F-]{36}$/.test(value.deploymentId) ||
    typeof value.deviceId !== "string" ||
    typeof value.phase !== "string" ||
    !(CLIENT_DEPLOYMENT_PHASES as readonly string[]).includes(value.phase) ||
    typeof value.code !== "string" ||
    typeof value.message !== "string" ||
    typeof value.releaseVersion !== "string" ||
    typeof value.environment !== "string" ||
    !(CLIENT_ENVIRONMENT_NAMES as readonly string[]).includes(
      value.environment
    ) ||
    typeof value.environmentRevision !== "number" ||
    !Number.isInteger(value.environmentRevision) ||
    typeof value.timestamp !== "number" ||
    !Number.isFinite(value.timestamp)
  ) {
    return null;
  }
  return {
    protocolVersion: 1,
    deploymentId: value.deploymentId,
    deviceId: value.deviceId,
    phase: value.phase as ClientDeploymentPhase,
    code: value.code,
    message: value.message,
    releaseVersion: value.releaseVersion,
    environment: value.environment as ClientEnvironmentName,
    environmentRevision: value.environmentRevision,
    timestamp: value.timestamp,
  };
}

const ALLOWED_TRANSITIONS: Record<
  ClientDeploymentPhase,
  readonly ClientDeploymentPhase[]
> = {
  PENDING: ["STAGING", "FAILED", "TIMED_OUT", "CANCELLED"],
  STAGING: ["DRAINING", "PREEMPTING", "FAILED", "TIMED_OUT", "CANCELLED"],
  DRAINING: ["ACTIVATING", "FAILED", "TIMED_OUT", "CANCELLED"],
  PREEMPTING: ["ACTIVATING", "FAILED", "TIMED_OUT", "CANCELLED"],
  ACTIVATING: ["VERIFYING", "FAILED", "ROLLED_BACK", "TIMED_OUT"],
  VERIFYING: ["SUCCEEDED", "FAILED", "ROLLED_BACK", "TIMED_OUT"],
  SUCCEEDED: [],
  FAILED: [],
  ROLLED_BACK: [],
  TIMED_OUT: [],
  CANCELLED: [],
};

/** 确认设备事件可推进当前部署状态。 */
export function canApplyDeploymentEvent(
  current: ClientDeploymentPhase,
  event: DeviceDeploymentEvent,
  identity: {
    deploymentId: string;
    clientId: string;
    releaseVersion: string;
    environment: ClientEnvironmentName;
    environmentRevision: number;
  }
): boolean {
  return (
    identity.deploymentId === event.deploymentId &&
    identity.clientId === event.deviceId &&
    identity.releaseVersion === event.releaseVersion &&
    identity.environment === event.environment &&
    identity.environmentRevision === event.environmentRevision &&
    ALLOWED_TRANSITIONS[current].includes(event.phase)
  );
}
