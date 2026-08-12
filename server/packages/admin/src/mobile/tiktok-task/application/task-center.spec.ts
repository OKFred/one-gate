import { describe, expect, it } from "vitest";
import { TikTokTaskApplicationError } from "./error.js";
import type {
  TikTokDeviceTaskCommand,
  TikTokDeviceTaskDispatcher,
  TikTokTaskActor,
} from "./ports.js";
import { TikTokTaskCenter } from "./task-center.js";

const PUBLICATION_ID = "8fa04e65-0c0c-46ca-bdb2-00bd21e53c28";
const GENERATED_ID = "54b70720-e174-4d80-8dd9-604246a78c90";
const ACTOR: TikTokTaskActor = {
  id: 7,
  userId: 11,
  username: "operator",
};

class FakeTikTokDeviceTaskDispatcher implements TikTokDeviceTaskDispatcher {
  calls: Array<{ command: TikTokDeviceTaskCommand; actor: TikTokTaskActor }> =
    [];

  async dispatch(command: TikTokDeviceTaskCommand, actor: TikTokTaskActor) {
    this.calls.push({ command, actor });
    return {
      taskId: "task-1",
      status: "PENDING" as const,
      traceId: "trace-1",
      expiresAtUtc: 1_800_000_000_000,
    };
  }
}

describe("TikTok 任务应用服务", () => {
  it("生成 publicationId、归一化契约并换算任务超时", async () => {
    const tasks = new FakeTikTokDeviceTaskDispatcher();
    const center = new TikTokTaskCenter({
      tasks,
      publicationIds: { next: () => GENERATED_ID },
    });

    const result = await center.dispatch(
      {
        clientId: "mobile-01",
        request: {
          contractVersion: 2,
          action: "publish",
          media: { mode: "direct", kind: "image", path: "/sdcard/a.jpg" },
          content: { title: "caption" },
          timeout: 500,
        },
        priority: "HIGH",
        preemptRunning: true,
        remark: "production publish",
        callbackUrl: "https://hodor.example/callback",
      },
      ACTOR
    );

    expect(result).toEqual({
      taskId: "task-1",
      status: "PENDING",
      traceId: "trace-1",
      expiresAtUtc: 1_800_000_000_000,
      contractVersion: 2,
      action: "publish",
      publicationId: GENERATED_ID,
    });
    expect(tasks.calls).toHaveLength(1);
    expect(tasks.calls[0]).toMatchObject({
      actor: ACTOR,
      command: {
        clientId: "mobile-01",
        scriptId: "tiktok.post",
        timeoutMs: 500_000,
        priority: "HIGH",
        preemptRunning: true,
        remark: "production publish",
        callbackUrl: "https://hodor.example/callback",
        params: {
          contractVersion: 2,
          action: "publish",
          publicationId: GENERATED_ID,
        },
      },
    });
  });

  it("recover 复用原 publicationId 且不调用 ID 生成器", async () => {
    const tasks = new FakeTikTokDeviceTaskDispatcher();
    let idCalls = 0;
    const center = new TikTokTaskCenter({
      tasks,
      publicationIds: {
        next: () => {
          idCalls += 1;
          return GENERATED_ID;
        },
      },
    });

    const result = await center.dispatch(
      {
        clientId: "mobile-01",
        request: {
          contractVersion: 2,
          action: "recover",
          publicationId: PUBLICATION_ID,
        },
      },
      ACTOR
    );

    expect(result.publicationId).toBe(PUBLICATION_ID);
    expect(idCalls).toBe(0);
    expect(tasks.calls[0]?.command.params).toMatchObject({
      action: "recover",
      publicationId: PUBLICATION_ID,
    });
  });

  it("在调用设备任务端口前把契约异常映射为应用异常", async () => {
    const tasks = new FakeTikTokDeviceTaskDispatcher();
    const center = new TikTokTaskCenter({
      tasks,
      publicationIds: { next: () => GENERATED_ID },
    });

    await expect(
      center.dispatch(
        {
          clientId: "mobile-01",
          request: { contractVersion: 2, action: "status" },
        },
        ACTOR
      )
    ).rejects.toThrow(TikTokTaskApplicationError);
    expect(tasks.calls).toHaveLength(0);
  });

  it("保留设备任务端口的非领域异常", async () => {
    const expected = new Error("MQTT unavailable");
    const tasks: TikTokDeviceTaskDispatcher = {
      dispatch: async () => Promise.reject(expected),
    };
    const center = new TikTokTaskCenter({
      tasks,
      publicationIds: { next: () => GENERATED_ID },
    });

    await expect(
      center.dispatch(
        {
          clientId: "mobile-01",
          request: { contractVersion: 2, action: "preflight" },
        },
        ACTOR
      )
    ).rejects.toBe(expected);
  });
});
