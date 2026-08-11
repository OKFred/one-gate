import mqttService from "../../../mqtt/service.js";
import type { DeviceTaskDispatchMessage } from "../domain/task.js";
import type {
  DeviceTaskActor,
  DeviceTaskPublisher,
} from "../application/ports.js";

/** 使用现有 MQTT Service 发布设备任务消息。 */
export class MqttDeviceTaskPublisher implements DeviceTaskPublisher {
  /** 发布到单台设备的隔离任务 Topic。 */
  async publish(
    message: DeviceTaskDispatchMessage,
    actor: DeviceTaskActor
  ): Promise<void> {
    await mqttService.publish.service(
      {
        topic: `autojs6/v2/devices/${message.deviceId}/tasks`,
        payload: JSON.stringify(message),
        qos: 1,
        retain: false,
        remark: `AutoJS6 v2 ${message.scriptId}`,
      },
      actor
    );
  }
}
