import { registerDeviceTaskResultHandler } from "./async-task/facade.js";
import { handleDeviceAppTaskResult } from "./device-app/service.js";

/** 幂等装配 Mobile 领域间的设备任务结果处理器。 */
export function initializeMobileTaskResultHandlers(): void {
  registerDeviceTaskResultHandler(
    "device.apps.list",
    handleDeviceAppTaskResult
  );
}
