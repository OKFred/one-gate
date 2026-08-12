import { DeviceCenter } from "../application/device-center.js";
import { webCryptoDeviceAdapter } from "./crypto.js";
import { DrizzleDeviceRepository } from "./repository.js";

/** 默认生产依赖装配后的设备注册与上报中心。 */
export const deviceCenter = new DeviceCenter({
  repository: new DrizzleDeviceRepository(),
  crypto: webCryptoDeviceAdapter,
  clock: { now: () => Date.now() },
});
