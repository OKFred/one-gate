import { axiosPlus } from '../../config';

export type DeviceOpsSessionStatus =
  | 'PENDING_DEVICE'
  | 'CONNECTED'
  | 'CLOSED'
  | 'REJECTED'
  | 'EXPIRED';

export interface DeviceOpsTicket {
  sessionId: string;
  status: DeviceOpsSessionStatus;
  wsUrl: string;
  operatorTicket: string;
  expiresAtUtc: number;
}

export interface DeviceOpsAudit {
  id: number;
  sessionId: string;
  requestId: string;
  clientId: string;
  actorId: number;
  operation: string;
  status: string;
  resultCode: string | null;
  durationMs: number | null;
  requestBytes: number;
  responseBytes: number | null;
  createTimeUtc: number;
  finishTimeUtc: number | null;
}

/** Open a short-lived asynchronous device operations session. */
export const openDeviceOpsSession = (clientId: string, durationMinutes = 10) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-ops/session/open',
    method: 'post',
    data: { clientId, durationMinutes },
  });

/** Issue a fresh one-time browser ticket for an active session. */
export const reconnectDeviceOpsSession = (sessionId: string) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-ops/session/reconnect',
    method: 'post',
    data: { sessionId },
  });

/** Close an active device operations session. */
export const closeDeviceOpsSession = (sessionId: string) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-ops/session/close',
    method: 'post',
    data: { sessionId },
  });

/** List non-sensitive operation audit indexes. */
export const listDeviceOpsAudits = (data: {
  clientId?: string;
  sessionId?: string;
  pageNo?: number;
  pageSize?: number;
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-ops/audit/list',
    method: 'post',
    data: { pageNo: 1, pageSize: 20, ...data },
  });

/** Reveal encrypted operation details; the server restricts this to super administrators. */
export const revealDeviceOpsAudit = (id: number) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/device-ops/audit/reveal',
    method: 'post',
    data: { id },
  });
