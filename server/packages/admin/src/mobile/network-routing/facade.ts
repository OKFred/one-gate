import type { NetworkRoutingStatusEvent } from "./domain.js";
import { networkRoutingRepository } from "./repository.js";
import { findDeviceTaskTarget } from "../device/facade.js";

/** 接收设备运行状态；过期 generation 会由仓库静默忽略。 */
export async function processNetworkRoutingStatus(
  event: NetworkRoutingStatusEvent
): Promise<boolean> {
  const device = await findDeviceTaskTarget(event.deviceId);
  if (!device?.isEnabled) return false;
  await networkRoutingRepository.getOrCreate(event.deviceId, 0);
  return networkRoutingRepository.updateRuntimeStatus(event);
}
