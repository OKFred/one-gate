import {
  canApplyDeploymentEvent,
  type DeviceDeploymentEvent,
} from "./domain/deployment.js";
import { clientDeploymentRepository } from "./repository.js";

export type DeploymentEventProcessResult = "APPLIED" | "DUPLICATE" | "REJECTED";

/** 处理手机通过独立 MQTT 管理主题上报的部署阶段。 */
export async function processIncomingDeploymentEvent(
  event: DeviceDeploymentEvent
): Promise<DeploymentEventProcessResult> {
  const current = await clientDeploymentRepository.getDeployment(
    event.deploymentId
  );
  if (!current) return "REJECTED";
  const identityMatches =
    current.deploymentId === event.deploymentId &&
    current.clientId === event.deviceId &&
    current.releaseVersion === event.releaseVersion &&
    current.environment === event.environment &&
    current.environmentRevision === event.environmentRevision;
  if (!identityMatches) return "REJECTED";
  if (current.phase === event.phase) return "DUPLICATE";
  if (
    !canApplyDeploymentEvent(current.phase, event, {
      deploymentId: current.deploymentId,
      clientId: current.clientId,
      releaseVersion: current.releaseVersion,
      environment: current.environment,
      environmentRevision: current.environmentRevision,
    })
  ) {
    return "REJECTED";
  }
  return (await clientDeploymentRepository.applyDeploymentEvent(current, event))
    ? "APPLIED"
    : "DUPLICATE";
}

/** 定时终结服务端已过期但设备未完成的部署。 */
export async function timeoutExpiredClientDeployments(): Promise<void> {
  await clientDeploymentRepository.timeoutExpiredDeployments(Date.now());
}
