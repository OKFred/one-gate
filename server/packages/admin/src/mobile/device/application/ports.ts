import type {
  DeviceEventType,
  DeviceReportedStatus,
} from "../domain/device.js";

export interface DeviceActor {
  id: number;
}

export interface DeviceRecord {
  id: number;
  clientId: string;
  deviceName: string | null;
  isEnabled: boolean;
  remark: string | null;
  reportedStatus: DeviceReportedStatus | null;
  lastHeartbeatTimeUtc: number | null;
  lastOnlineTimeUtc: number | null;
  lastOfflineTimeUtc: number | null;
  manufacturer: string | null;
  brand: string | null;
  model: string | null;
  androidVersion: string | null;
  androidSdk: number | null;
  autojs6Version: string | null;
  clientVersion: string | null;
  protocolVersion: number | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
  networkConnected: boolean | null;
  networkType: string | null;
  imeiStatus: string | null;
  imeiMaskedJson: string | null;
  imeiCiphertext: string | null;
  serialStatus: string | null;
  serialMasked: string | null;
  serialCiphertext: string | null;
  capabilitiesJson: string | null;
  reportedExtraJson: string | null;
  customMetadataJson: string | null;
  customSensitiveMetadataCiphertext: string | null;
  reportTokenHash: string | null;
  creatorId: number;
  updaterId: number | null;
  createTimeUtc: number;
  updateTimeUtc: number | null;
}

export interface DeviceEventRecord {
  id: number;
  eventId: string;
  clientId: string;
  eventType: DeviceEventType;
  eventTimeUtc: number;
  summaryJson: string | null;
  payloadCiphertext: string | null;
  createTimeUtc: number;
}

export type DeviceCreateRecord = Omit<
  DeviceRecord,
  "id" | "updaterId" | "createTimeUtc" | "updateTimeUtc"
>;

export interface DeviceAdminUpdateRecord {
  id: number;
  clientId: string;
  deviceName: string | null;
  isEnabled?: boolean;
  remark: string | null;
  updaterId: number;
}

export type DeviceSnapshotUpdate = Partial<
  Omit<DeviceRecord, "id" | "clientId" | "creatorId" | "createTimeUtc">
>;

export type DeviceSortKey =
  | "id"
  | "clientId"
  | "deviceName"
  | "isEnabled"
  | "lastHeartbeatTimeUtc"
  | "batteryLevel"
  | "createTimeUtc";

export interface DeviceListParams {
  pageNo: number;
  pageSize: number;
  keyword?: string;
  isEnabled?: boolean;
  onlineStatus?: DeviceReportedStatus;
  onlineCutoff: number;
  orderBy?: DeviceSortKey;
  descend?: boolean;
}

export interface DeviceEventListParams {
  clientId: string;
  pageNo: number;
  pageSize: number;
  eventType?: DeviceEventType;
  startTimeUtc?: number;
  endTimeUtc?: number;
}

export interface DevicePage {
  list: DeviceRecord[];
  total: number;
  totalPage: number;
  currentPage: number;
  pageNo: number;
  pageSize: number;
}

export interface DeviceEventPage {
  list: DeviceEventRecord[];
  total: number;
  totalPage: number;
  currentPage: number;
  pageNo: number;
  pageSize: number;
}

export interface DeviceRepositoryPort {
  add(data: DeviceCreateRecord): Promise<number>;
  update(data: DeviceAdminUpdateRecord): Promise<void>;
  updateSnapshot(clientId: string, data: DeviceSnapshotUpdate): Promise<void>;
  delete(id: number): Promise<void>;
  getById(id: number): Promise<DeviceRecord | undefined>;
  getByClientId(clientId: string): Promise<DeviceRecord | undefined>;
  list(params: DeviceListParams): Promise<DevicePage>;
  insertEvent(
    data: Omit<DeviceEventRecord, "id" | "createTimeUtc">
  ): Promise<boolean>;
  listEvents(params: DeviceEventListParams): Promise<DeviceEventPage>;
  getEventById(id: number): Promise<DeviceEventRecord | undefined>;
  markTimedOutOffline(cutoff: number, now: number): Promise<number>;
  deleteEventsBefore(cutoff: number): Promise<number>;
}

export interface DeviceCryptoPort {
  encrypt(plaintext: string, aad: string): Promise<string>;
  decrypt(ciphertext: string, aad: string): Promise<string>;
  hashToken(token: string): Promise<string>;
  verifyToken(token: string, expectedHash: string): Promise<boolean>;
  generateToken(): Promise<{ token: string; tokenHash: string }>;
}

export interface DeviceClockPort {
  now(): number;
}
