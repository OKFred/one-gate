import { setEnv } from "@hodor/core/utils/env.js";
import {
  encryptSensitiveText,
  hashDeviceToken,
} from "@hodor/admin/mobile/device/infrastructure/crypto.js";
import {
  MobileOpsArtifactError,
  parseMobileOpsArtifactFrame,
} from "./mobile-ops-artifact.js";

const MAX_FRAME_BYTES = 64 * 1024;
const ALLOWED_OPERATIONS = new Set([
  "device.ops.capabilities",
  "device.audio.get",
  "device.audio.set",
  "device.audio.mute",
  "device.audio.unmute",
  "device.storage.stat",
  "device.files.list",
  "device.foreground.get",
  "device.network.get",
  "device.screen.capture",
]);

interface SessionMetadata {
  sessionId: string;
  clientId: string;
  actorId: number;
  expiresAt: number;
}

interface SocketAttachment {
  role: "device" | "operator";
  sessionId: string;
}

/** Return a JSON response for internal Durable Object control calls. */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Per-session WebSocket coordinator with hibernation support. */
export class MobileOpsSession implements DurableObject {
  /** Create a session Durable Object. */
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  /** Load required session metadata. */
  private async metadata(): Promise<SessionMetadata | null> {
    return (await this.state.storage.get<SessionMetadata>("metadata")) || null;
  }

  /** Close every connected socket with a stable reason. */
  private closeSockets(code: number, reason: string): void {
    for (const socket of this.state.getWebSockets()) {
      try {
        socket.close(code, reason.slice(0, 100));
      } catch {
        // Socket may already be gone while hibernating.
      }
    }
  }

  /** Update the D1 session lifecycle without storing frame bodies in logs. */
  private async updateSession(
    metadata: SessionMetadata,
    input: {
      status: string;
      terminal?: boolean;
      code?: string;
      message?: string;
      connected?: boolean;
    }
  ): Promise<void> {
    const now = Date.now();
    await this.env.DB.prepare(
      `UPDATE admin_mobile_device_ops_session
       SET status = ?, active_client_id = ?, connected_at_utc = COALESCE(connected_at_utc, ?),
           last_active_at_utc = ?, closed_at_utc = ?, close_code = ?, close_message = ?, update_time_utc = ?
       WHERE session_id = ?`
    )
      .bind(
        input.status,
        input.terminal ? null : metadata.clientId,
        input.connected ? now : null,
        now,
        input.terminal ? now : null,
        input.code || null,
        input.message || null,
        now,
        metadata.sessionId
      )
      .run();
  }

  /** Handle internal setup and external WebSocket upgrade requests. */
  async fetch(request: Request): Promise<Response> {
    setEnv(this.env);
    const url = new URL(request.url);
    if (request.headers.get("x-ops-internal") === "1") {
      if (url.pathname === "/init" && request.method === "POST") {
        const body = (await request.json()) as SessionMetadata & {
          ticketHash: string;
        };
        if (
          !body.sessionId ||
          !body.clientId ||
          !body.ticketHash ||
          !Number.isInteger(body.actorId) ||
          body.expiresAt <= Date.now()
        ) {
          return json({ ok: false }, 400);
        }
        await this.state.storage.put({
          metadata: {
            sessionId: body.sessionId,
            clientId: body.clientId,
            actorId: body.actorId,
            expiresAt: body.expiresAt,
          } satisfies SessionMetadata,
          operatorTicketHash: body.ticketHash,
          operatorTicketExpiresAt: Date.now() + 60_000,
        });
        await this.state.storage.setAlarm(body.expiresAt);
        return json({ ok: true });
      }
      if (url.pathname === "/ticket" && request.method === "POST") {
        const metadata = await this.metadata();
        const body = (await request.json()) as { ticketHash?: string };
        if (!metadata || !body.ticketHash || metadata.expiresAt <= Date.now()) {
          return json({ ok: false }, 409);
        }
        await this.state.storage.put({
          operatorTicketHash: body.ticketHash,
          operatorTicketExpiresAt: Date.now() + 60_000,
        });
        return json({ ok: true });
      }
      if (url.pathname === "/close" && request.method === "POST") {
        const metadata = await this.metadata();
        this.closeSockets(1000, "OPS_SESSION_CLOSED");
        if (metadata) {
          await this.updateSession(metadata, {
            status: "CLOSED",
            terminal: true,
            code: "OPS_SESSION_CLOSED",
            message: "Operations session was closed",
          });
        }
        await this.state.storage.deleteAlarm();
        return json({ ok: true });
      }
      return json({ ok: false }, 404);
    }

    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const metadata = await this.metadata();
    if (!metadata || metadata.expiresAt <= Date.now()) {
      return new Response("Session expired", { status: 410 });
    }
    const role = request.headers.get("x-ops-role");
    if (role !== "device" && role !== "operator") {
      return new Response("Invalid role", { status: 401 });
    }
    if (this.state.getWebSockets(role).length > 0) {
      return new Response("Role already connected", { status: 409 });
    }
    if (role === "device") {
      if (request.headers.get("x-ops-client-id") !== metadata.clientId) {
        return new Response("Device mismatch", { status: 403 });
      }
    } else {
      const ticket = request.headers.get("x-ops-ticket") || "";
      const expectedHash =
        await this.state.storage.get<string>("operatorTicketHash");
      const ticketExpiresAt =
        (await this.state.storage.get<number>("operatorTicketExpiresAt")) || 0;
      if (
        !ticket ||
        !expectedHash ||
        ticketExpiresAt <= Date.now() ||
        (await hashDeviceToken(ticket)) !== expectedHash
      ) {
        return new Response("Invalid or expired ticket", { status: 401 });
      }
      await this.state.storage.delete([
        "operatorTicketHash",
        "operatorTicketExpiresAt",
      ]);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment({
      role,
      sessionId: metadata.sessionId,
    } satisfies SocketAttachment);
    this.state.acceptWebSocket(server, [role]);
    if (role === "device") {
      await this.updateSession(metadata, {
        status: "CONNECTED",
        connected: true,
      });
    }
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { "sec-websocket-protocol": "autojs6-ops-v1" },
    });
  }

  /** Relay and audit a structured WebSocket frame. */
  async webSocketMessage(
    socket: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    setEnv(this.env);
    const attachment =
      socket.deserializeAttachment() as SocketAttachment | null;
    const metadata = await this.metadata();
    if (!attachment || !metadata || metadata.expiresAt <= Date.now()) {
      socket.close(1008, "OPS_SESSION_INVALID");
      return;
    }
    if (typeof message !== "string") {
      if (attachment.role !== "device") {
        socket.close(1008, "OPS_BINARY_NOT_ALLOWED");
        return;
      }
      try {
        const header = parseMobileOpsArtifactFrame(message, metadata.sessionId);
        const audit = await this.env.DB.prepare(
          `SELECT operation, status, response_bytes AS responseBytes
           FROM admin_mobile_device_ops_audit
           WHERE session_id = ? AND request_id = ?`
        )
          .bind(metadata.sessionId, header.requestId)
          .first<{
            operation: string;
            status: string;
            responseBytes: number | null;
          }>();
        if (
          audit?.operation !== "device.screen.capture" ||
          audit.status !== "EXECUTING" ||
          (audit.responseBytes ?? 0) > 0
        ) {
          socket.close(1008, "OPS_ARTIFACT_NOT_EXPECTED");
          return;
        }
        const artifactAudit = await this.env.DB.prepare(
          `UPDATE admin_mobile_device_ops_audit
           SET response_bytes = COALESCE(response_bytes, 0) + ?
           WHERE session_id = ? AND request_id = ? AND status = 'EXECUTING'
             AND COALESCE(response_bytes, 0) = 0`
        )
          .bind(message.byteLength, metadata.sessionId, header.requestId)
          .run();
        if ((artifactAudit.meta.changes ?? 0) !== 1) {
          socket.close(1008, "OPS_ARTIFACT_NOT_EXPECTED");
          return;
        }
        for (const peer of this.state.getWebSockets("operator")) {
          peer.send(message);
        }
        await this.updateSession(metadata, { status: "CONNECTED" });
      } catch (error) {
        const artifactError =
          error instanceof MobileOpsArtifactError
            ? error
            : new MobileOpsArtifactError("OPS_ARTIFACT_INVALID");
        socket.close(artifactError.closeCode, artifactError.message);
      }
      return;
    }
    if (new TextEncoder().encode(message).byteLength > MAX_FRAME_BYTES) {
      socket.close(1009, "OPS_FRAME_TOO_LARGE");
      return;
    }
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(message) as Record<string, unknown>;
    } catch {
      socket.close(1008, "OPS_FRAME_INVALID");
      return;
    }
    if (frame.protocolVersion !== 1 || frame.sessionId !== metadata.sessionId) {
      socket.close(1008, "OPS_FRAME_INVALID");
      return;
    }
    const now = Date.now();
    if (attachment.role === "operator") {
      if (
        frame.type !== "request" ||
        typeof frame.requestId !== "string" ||
        typeof frame.operation !== "string" ||
        !ALLOWED_OPERATIONS.has(frame.operation)
      ) {
        socket.close(1008, "OPS_REQUEST_NOT_ALLOWED");
        return;
      }
      const requestId = frame.requestId;
      const ciphertext = await encryptSensitiveText(
        message,
        `mobile-ops:${metadata.sessionId}:${requestId}:request`
      );
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO admin_mobile_device_ops_audit
         (session_id, request_id, client_id, actor_id, operation, status,
          request_bytes, request_ciphertext, create_time_utc)
         VALUES (?, ?, ?, ?, ?, 'EXECUTING', ?, ?, ?)`
      )
        .bind(
          metadata.sessionId,
          requestId,
          metadata.clientId,
          metadata.actorId,
          frame.operation,
          new TextEncoder().encode(message).byteLength,
          ciphertext,
          now
        )
        .run();
      for (const peer of this.state.getWebSockets("device")) peer.send(message);
    } else {
      if (frame.type === "response" && typeof frame.requestId === "string") {
        const ciphertext = await encryptSensitiveText(
          message,
          `mobile-ops:${metadata.sessionId}:${frame.requestId}:response`
        );
        await this.env.DB.prepare(
          `UPDATE admin_mobile_device_ops_audit
           SET status = ?, result_code = ?, duration_ms = ?,
               response_bytes = COALESCE(response_bytes, 0) + ?,
               response_ciphertext = ?, finish_time_utc = ?
           WHERE session_id = ? AND request_id = ? AND finish_time_utc IS NULL`
        )
          .bind(
            typeof frame.status === "string" ? frame.status : "FAILURE",
            typeof frame.code === "string" ? frame.code : null,
            typeof frame.durationMs === "number" ? frame.durationMs : null,
            new TextEncoder().encode(message).byteLength,
            ciphertext,
            now,
            metadata.sessionId,
            frame.requestId
          )
          .run();
      }
      for (const peer of this.state.getWebSockets("operator"))
        peer.send(message);
    }
    await this.updateSession(metadata, {
      status: "CONNECTED",
      connected: attachment.role === "device",
    });
  }

  /** Keep the session available for the 30-second browser/device reconnect window. */
  async webSocketClose(
    _socket: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    const metadata = await this.metadata();
    if (metadata && metadata.expiresAt <= Date.now()) {
      await this.updateSession(metadata, {
        status: "EXPIRED",
        terminal: true,
        code: "OPS_SESSION_EXPIRED",
        message: "Operations session expired",
      });
    }
  }

  /** Close a failed socket without exposing error details. */
  webSocketError(socket: WebSocket): void {
    try {
      socket.close(1011, "OPS_SOCKET_ERROR");
    } catch {
      // Socket already closed.
    }
  }

  /** Expire the session at its configured deadline. */
  async alarm(): Promise<void> {
    const metadata = await this.metadata();
    this.closeSockets(1000, "OPS_SESSION_EXPIRED");
    if (metadata) {
      await this.updateSession(metadata, {
        status: "EXPIRED",
        terminal: true,
        code: "OPS_SESSION_EXPIRED",
        message: "Operations session expired",
      });
    }
  }
}
