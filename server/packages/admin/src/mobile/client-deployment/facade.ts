import {
  canApplyDeploymentEvent,
  type DeviceDeploymentEvent,
} from "./domain/deployment.js";
import { clientDeploymentRepository } from "./repository.js";

/** 处理手机通过独立 MQTT 管理主题上报的部署阶段。 */
export async function processIncomingDeploymentEvent(
  event: DeviceDeploymentEvent
): Promise<boolean> {
  const current = await clientDeploymentRepository.getDeployment(
    event.deploymentId
  );
  if (!current) return false;
  if (
    !canApplyDeploymentEvent(current.phase, event, {
      deploymentId: current.deploymentId,
      clientId: current.clientId,
      releaseVersion: current.releaseVersion,
      environment: current.environment,
      environmentRevision: current.environmentRevision,
    })
  ) {
    return false;
  }
  return clientDeploymentRepository.applyDeploymentEvent(current, event);
}

/** 定时终结服务端已过期但设备未完成的部署。 */
export async function timeoutExpiredClientDeployments(): Promise<void> {
  await clientDeploymentRepository.timeoutExpiredDeployments(Date.now());
}
