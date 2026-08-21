import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { hashDeviceToken } from "@hodor/admin/mobile/device/infrastructure/crypto.js";

const sessionId = "ops_testsession12345678";
const clientId = "phone-test";

/** Wait for the next JSON message from a WebSocket. */
function nextMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("WebSocket message timeout")),
      2000
    );
    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timer);
        resolve(JSON.parse(String(event.data)) as Record<string, unknown>);
      },
      { once: true }
    );
  });
}

beforeEach(async () => {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS admin_mobile_device_ops_session (id integer PRIMARY KEY AUTOINCREMENT, session_id text NOT NULL UNIQUE, active_client_id text, client_id text NOT NULL, actor_id integer NOT NULL, actor_name text NOT NULL, status text NOT NULL, connected_at_utc integer, last_active_at_utc integer, expires_at_utc integer NOT NULL, closed_at_utc integer, close_code text, close_message text, create_time_utc integer NOT NULL, update_time_utc integer)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS admin_mobile_device_ops_audit (id integer PRIMARY KEY AUTOINCREMENT, session_id text NOT NULL, request_id text NOT NULL, client_id text NOT NULL, actor_id integer NOT NULL, operation text NOT NULL, status text NOT NULL, result_code text, duration_ms integer, request_bytes integer NOT NULL, response_bytes integer, request_ciphertext text NOT NULL, response_ciphertext text, create_time_utc integer NOT NULL, finish_time_utc integer, UNIQUE(session_id, request_id))"
  ).run();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_mobile_device_ops_audit"),
    env.DB.prepare("DELETE FROM admin_mobile_device_ops_session"),
  ]);
});

describe("MobileOpsSession Durable Object", () => {
  it("consumes one operator ticket and relays audited structured frames", async () => {
    const ticket = "operator-ticket-value";
    const expiresAt = Date.now() + 60_000;
    await env.DB.prepare(
      `INSERT INTO admin_mobile_device_ops_session
       (session_id, active_client_id, client_id, actor_id, actor_name, status,
        expires_at_utc, create_time_utc)
       VALUES (?, ?, ?, 1, 'tester', 'PENDING_DEVICE', ?, ?)`
    )
      .bind(sessionId, clientId, clientId, expiresAt, Date.now())
      .run();
    const stub = env.MOBILE_OPS.getByName(sessionId);
    const initialized = await stub.fetch("https://mobile-ops.internal/init", {
      method: "POST",
      headers: { "content-type": "application/json", "x-ops-internal": "1" },
      body: JSON.stringify({
        sessionId,
        clientId,
        actorId: 1,
        expiresAt,
        ticketHash: await hashDeviceToken(ticket),
      }),
    });
    expect(initialized.status).toBe(200);

    const operatorResponse = await stub.fetch(
      "https://mobile-ops.internal/ws",
      {
        headers: {
          upgrade: "websocket",
          "x-ops-role": "operator",
          "x-ops-ticket": ticket,
        },
      }
    );
    expect(operatorResponse.status).toBe(101);
    const operator = operatorResponse.webSocket!;
    operator.accept();

    const reused = await stub.fetch("https://mobile-ops.internal/ws", {
      headers: {
        upgrade: "websocket",
        "x-ops-role": "operator",
        "x-ops-ticket": ticket,
      },
    });
    expect(reused.status).toBe(409);

    const deviceResponse = await stub.fetch("https://mobile-ops.internal/ws", {
      headers: {
        upgrade: "websocket",
        "x-ops-role": "device",
        "x-ops-client-id": clientId,
      },
    });
    const device = deviceResponse.webSocket!;
    device.accept();

    const createdAt = Date.now();
    const request = {
      protocolVersion: 1,
      type: "request",
      sessionId,
      requestId: "req_test12345678",
      operation: "device.network.get",
      params: {},
      createdAt,
      expiresAt: createdAt + 15_000,
    };
    const deviceMessage = nextMessage(device);
    operator.send(JSON.stringify(request));
    expect(await deviceMessage).toMatchObject({ requestId: request.requestId });

    const response = {
      protocolVersion: 1,
      type: "response",
      sessionId,
      requestId: request.requestId,
      operation: request.operation,
      status: "SUCCESS",
      code: "OPS_OPERATION_SUCCEEDED",
      message: "Operation completed",
      data: { activeTransport: "wifi" },
      startedAt: createdAt,
      finishedAt: createdAt + 1,
      durationMs: 1,
    };
    const operatorMessage = nextMessage(operator);
    device.send(JSON.stringify(response));
    expect(await operatorMessage).toMatchObject({ status: "SUCCESS" });

    const audit = await env.DB.prepare(
      `SELECT status, request_ciphertext AS requestCiphertext,
              response_ciphertext AS responseCiphertext
       FROM admin_mobile_device_ops_audit WHERE request_id = ?`
    )
      .bind(request.requestId)
      .first<{
        status: string;
        requestCiphertext: string;
        responseCiphertext: string;
      }>();
    expect(audit?.status).toBe("SUCCESS");
    expect(audit?.requestCiphertext).not.toContain("device.network.get");
    expect(audit?.responseCiphertext).not.toContain("activeTransport");
    operator.close();
    device.close();
  });
});
