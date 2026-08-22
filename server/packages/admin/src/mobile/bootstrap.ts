import { registerDeviceTaskResultHandler } from "./async-task/facade.js";
import { handleDeviceAppTaskResult } from "./device-app/service.js";
import { handleNetworkRoutingTaskResult } from "./network-routing/service.js";

/** 幂等装配 Mobile 领域间的设备任务结果处理器。 */
export function initializeMobileTaskResultHandlers(): void {
  registerDeviceTaskResultHandler(
    "device.apps.list",
    handleDeviceAppTaskResult
  );
  registerDeviceTaskResultHandler(
    "device.network.routing.apply",
    handleNetworkRoutingTaskResult
  );
  registerDeviceTaskResultHandler(
    "device.network.routing.disable",
    handleNetworkRoutingTaskResult
  );
}
