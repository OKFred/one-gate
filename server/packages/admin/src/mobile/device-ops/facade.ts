import { deviceOpsRepository } from "./repository.js";

/** Expire active operations sessions. */
export const expireDeviceOpsSessions = () =>
  deviceOpsRepository.expireSessions(Date.now());

/** Delete operations audits older than 30 days. */
export const cleanupDeviceOpsAudits = () =>
  deviceOpsRepository.cleanupAudits(Date.now() - 30 * 24 * 60 * 60 * 1000);

/** Apply a non-sensitive mobile operations session lifecycle event. */
export async function processDeviceOpsSessionEvent(input: {
  protocolVersion: 1;
  sessionId: string;
  deviceId: string;
  status: "CONNECTING" | "CONNECTED" | "CLOSED" | "REJECTED";
  code: string;
  message: string;
  timestamp: number;
}): Promise<void> {
  const row = await deviceOpsRepository.getSession(input.sessionId);
  if (!row || row.clientId !== input.deviceId) return;
  await deviceOpsRepository.updateSession(input.sessionId, {
    status:
      input.status === "CONNECTED"
        ? "CONNECTED"
        : input.status === "CONNECTING"
          ? "PENDING_DEVICE"
          : input.status,
    code: input.status === "CONNECTING" ? null : input.code,
    message: input.status === "CONNECTING" ? null : input.message,
    connectedAtUtc: input.status === "CONNECTED" ? input.timestamp : undefined,
    lastActiveAtUtc: input.timestamp,
    terminal: input.status === "CLOSED" || input.status === "REJECTED",
  });
}
