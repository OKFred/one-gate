import { deviceTaskCenter } from "./infrastructure/container.js";
import type { DeviceTaskActor } from "./application/ports.js";
import type {
  DispatchTrustedTaskParams,
  DispatchTrustedTaskResult,
  LegacyDeviceTaskCompletion,
  LegacyDeviceTaskResult,
} from "./application/task-center.js";

export {
  AUTOJS6_PROTOCOL_VERSION,
  MOBILE_TASK_PRIORITIES,
  MOBILE_TASK_STATUSES,
  MOBILE_TASK_TERMINAL_STATUSES,
  type DeviceTaskResultPayload,
  type MobileTaskPriority,
  type MobileTaskStatus,
  type MobileTaskTerminalStatus,
} from "./domain/task.js";
export {
  MOBILE_TRUSTED_SCRIPT_IDS,
  TRUSTED_SCRIPT_CATALOG,
  type TrustedScriptId,
} from "./domain/trusted-script.js";
export type {
  DispatchTrustedTaskParams,
  DispatchTrustedTaskResult,
  LegacyDeviceTaskResult,
  LegacyDeviceTaskCompletion,
} from "./application/task-center.js";
export type { DeviceTaskResultHandler } from "./application/ports.js";

/** 注册或幂等替换一个可信脚本结果后处理器。 */
export const registerDeviceTaskResultHandler =
  deviceTaskCenter.registerResultHandler.bind(deviceTaskCenter);

/** 分页查询设备任务。 */
export const listDeviceTasks =
  deviceTaskCenter.listTasks.bind(deviceTaskCenter);

/** 按任务标识查询设备任务。 */
export const getDeviceTask = deviceTaskCenter.getTask.bind(deviceTaskCenter);

/** 下发一条可信设备任务。 */
export const dispatchTrustedTask: (
  input: DispatchTrustedTaskParams,
  actor: DeviceTaskActor
) => Promise<DispatchTrustedTaskResult> =
  deviceTaskCenter.dispatchTrustedTask.bind(deviceTaskCenter);

/** 幂等保存设备任务终态。 */
export const handleDeviceTaskResult =
  deviceTaskCenter.handleDeviceTaskResult.bind(deviceTaskCenter);

/** 处理设备结果及领域后处理。 */
export const processIncomingDeviceTaskResult =
  deviceTaskCenter.processIncomingDeviceTaskResult.bind(deviceTaskCenter);

/** 写入旧手机客户端兼容结果。 */
export const completeLegacyDeviceTask: (
  result: LegacyDeviceTaskResult
) => Promise<LegacyDeviceTaskCompletion> =
  deviceTaskCenter.completeLegacyDeviceTask.bind(deviceTaskCenter);

/** 扫描并超时服务端等待过期的任务。 */
export const timeoutExpiredDeviceTasks =
  deviceTaskCenter.timeoutExpiredDeviceTasks.bind(deviceTaskCenter);
