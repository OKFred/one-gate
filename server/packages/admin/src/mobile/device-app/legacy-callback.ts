import { DeviceTaskApplicationError } from "../async-task/application/error.js";
import type { LegacyDeviceTaskResult } from "../async-task/facade.js";

interface LegacyCallbackTaskTarget {
  clientId: string;
}

export interface LegacyDeviceAppCallbackCompletion {
  completed: boolean;
  task: {
    cat: string;
    clientId: string;
  };
}

export interface LegacyDeviceAppCallbackDependencies {
  getDeviceTask(taskId: string): Promise<LegacyCallbackTaskTarget | undefined>;
  verifyDeviceReportToken(clientId: string, token: string): Promise<void>;
  completeLegacyDeviceTask(
    result: LegacyDeviceTaskResult
  ): Promise<LegacyDeviceAppCallbackCompletion>;
}

/**
 * 先根据任务锁定目标设备并完成来源认证，再调用旧任务完成用例。
 * 该顺序保证认证失败时不会发生任务状态写入。
 */
export async function completeAuthenticatedLegacyDeviceAppCallback(
  result: LegacyDeviceTaskResult,
  token: string,
  dependencies: LegacyDeviceAppCallbackDependencies
): Promise<LegacyDeviceAppCallbackCompletion> {
  const task = await dependencies.getDeviceTask(result.taskId);
  if (!task) throw new DeviceTaskApplicationError("Task not found");

  await dependencies.verifyDeviceReportToken(task.clientId, token);
  return dependencies.completeLegacyDeviceTask(result);
}
