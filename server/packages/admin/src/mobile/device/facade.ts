import type { DeviceActor } from "./application/ports.js";
import { deviceCenter } from "./infrastructure/container.js";
import type {
  AddDeviceInput,
  DeviceEventInput,
  DeviceInfoInput,
  DevicePresenceInput,
  ListDeviceEventsInput,
  ListDevicesInput,
  RevealDeviceTarget,
  UpdateDeviceInput,
  UpdateDeviceMetadataInput,
} from "./application/device-center.js";

export type {
  DeviceEventInput,
  DeviceInfoInput,
  DevicePresenceInput,
} from "./application/device-center.js";

export const listDevices = (input: ListDevicesInput) =>
  deviceCenter.listDevices(input);
export const addDevice = (input: AddDeviceInput, actor: DeviceActor) =>
  deviceCenter.addDevice(input, actor);
export const updateDevice = (input: UpdateDeviceInput, actor: DeviceActor) =>
  deviceCenter.updateDevice(input, actor);
export const getDevice = (id: number) => deviceCenter.getDevice(id);
export const deleteDevice = (id: number) => deviceCenter.deleteDevice(id);
export const updateDeviceMetadata = (
  input: UpdateDeviceMetadataInput,
  actor: DeviceActor
) => deviceCenter.updateDeviceMetadata(input, actor);
export const listDeviceEvents = (input: ListDeviceEventsInput) =>
  deviceCenter.listDeviceEvents(input);
export const revealDeviceSensitive = (id: number, target: RevealDeviceTarget) =>
  deviceCenter.revealSensitive(id, target);
export const resetDeviceReportToken = (id: number) =>
  deviceCenter.resetReportToken(id);
export const verifyDeviceReportToken = (clientId: string, token: string) =>
  deviceCenter.verifyDeviceReportToken(clientId, token);
export const processDevicePresence = (
  input: DevicePresenceInput,
  token?: string
) => deviceCenter.processDevicePresence(input, token);
export const processDeviceInfo = (input: DeviceInfoInput, token?: string) =>
  deviceCenter.processDeviceInfo(input, token);
export const processDeviceEvent = (input: DeviceEventInput, token?: string) =>
  deviceCenter.processDeviceEvent(input, token);
export const markTimedOutDevicesOffline = () =>
  deviceCenter.markTimedOutDevicesOffline();
export const cleanupExpiredDeviceEvents = () =>
  deviceCenter.cleanupExpiredDeviceEvents();
export const findDeviceTaskTarget = (clientId: string) =>
  deviceCenter.findDeviceTaskTarget(clientId);
export const getDeviceLogLabel = (deviceId: string) =>
  deviceCenter.getDeviceLogLabel(deviceId);
