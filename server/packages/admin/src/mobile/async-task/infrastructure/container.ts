import { getEnv } from "@hodor/core/utils/env";
import { findDeviceTaskTarget } from "../../device/facade.js";
import { DeviceTaskCenter } from "../application/task-center.js";
import { DeviceTaskResultHandlerRegistry } from "../application/result-handler-registry.js";
import { DrizzleDeviceTaskRepository } from "./repository.js";
import { MqttDeviceTaskPublisher } from "./mqtt-publisher.js";

const resultHandlers = new DeviceTaskResultHandlerRegistry();

/** 默认生产依赖装配后的设备任务中心。 */
export const deviceTaskCenter = new DeviceTaskCenter({
  repository: new DrizzleDeviceTaskRepository(),
  devices: { getByClientId: findDeviceTaskTarget },
  publisher: new MqttDeviceTaskPublisher(),
  clock: { now: () => Date.now() },
  ids: { next: () => crypto.randomUUID() },
  settings: {
    getCallbackUrl: () => getEnv("AUTOJS6_CALLBACK_URL") || undefined,
    getResultGraceMs: () => getEnv("AUTOJS6_RESULT_GRACE_MS"),
  },
  resultHandlers,
});
