import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIKTOK_LINK,
  DEFAULT_TIKTOK_POLICY,
  normalizeTikTokTaskRequest,
  TikTokContractViolation,
} from "./contract.js";

const PUBLICATION_ID = "8fa04e65-0c0c-46ca-bdb2-00bd21e53c28";
const GENERATED_ID = "54b70720-e174-4d80-8dd9-604246a78c90";

describe("TikTok v2 领域契约", () => {
  it("归一化单视频发布并填充服务端默认值", () => {
    const result = normalizeTikTokTaskRequest(
      {
        contractVersion: 2,
        action: "publish",
        expectedHandle: "@creator.account",
        media: {
          mode: "direct",
          kind: "video",
          path: "/sdcard/Download/tiktok-materials/clip.mp4",
        },
        content: { title: "Evening walk", details: "A quiet moment." },
      },
      () => GENERATED_ID
    );

    expect(result).toMatchObject({
      timeoutSeconds: 420,
      params: {
        contractVersion: 2,
        action: "publish",
        publicationId: GENERATED_ID,
        expectedHandle: "creator.account",
        policy: DEFAULT_TIKTOK_POLICY,
        link: DEFAULT_TIKTOK_LINK,
      },
    });
    expect(result.params.media).toEqual({
      mode: "direct",
      kind: "video",
      path: "/sdcard/Download/tiktok-materials/clip.mp4",
    });
  });

  it("归一化混合素材池及显式策略", () => {
    const result = normalizeTikTokTaskRequest(
      {
        contractVersion: 2,
        action: "publish",
        publicationId: PUBLICATION_ID.toUpperCase(),
        media: {
          mode: "pool",
          kind: "auto",
          paths: [
            "/sdcard/Download/tiktok-materials/photo.jpg",
            "/sdcard/Download/tiktok-materials/clip.mp4",
          ],
        },
        content: { titles: ["Look one", "Look two"] },
        policy: {
          minIntervalSeconds: 3600,
          maxPostsPerDay: 2,
          materialReuseSeconds: 7200,
          captionReuseSeconds: 1800,
        },
        link: { maxAttempts: 10, retrySeconds: 20 },
        timeout: 500,
      },
      () => GENERATED_ID
    );

    expect(result.params.publicationId).toBe(PUBLICATION_ID);
    expect(result.params.media?.kind).toBe("auto");
    expect(result.params.policy).toEqual({
      minIntervalSeconds: 3600,
      maxPostsPerDay: 2,
      materialReuseSeconds: 7200,
      captionReuseSeconds: 1800,
    });
    expect(result.params.link).toEqual({ maxAttempts: 10, retrySeconds: 20 });
    expect(result.timeoutSeconds).toBe(500);
  });

  it.each(["recover", "status"] as const)(
    "%s 必须复用原 publicationId",
    (action) => {
      expect(() =>
        normalizeTikTokTaskRequest(
          { contractVersion: 2, action },
          () => GENERATED_ID
        )
      ).toThrow(`publicationId is required when action is ${action}`);

      expect(
        normalizeTikTokTaskRequest(
          { contractVersion: 2, action, publicationId: PUBLICATION_ID },
          () => GENERATED_ID
        ).params.publicationId
      ).toBe(PUBLICATION_ID);
    }
  );

  it("preflight 可生成 publicationId 且不要求素材和文案", () => {
    const result = normalizeTikTokTaskRequest(
      { contractVersion: 2, action: "preflight" },
      () => GENERATED_ID
    );
    expect(result.params).toMatchObject({
      action: "preflight",
      publicationId: GENERATED_ID,
      content: { title: "", details: "", titles: [], detailsPool: [] },
    });
    expect(result.params.media).toBeUndefined();
  });

  it("拒绝非 v2、未知动作、未知字段和隐式数字字符串", () => {
    expect(() =>
      normalizeTikTokTaskRequest(
        { contractVersion: 1, action: "preflight" },
        () => GENERATED_ID
      )
    ).toThrow("contractVersion must be 2");
    expect(() =>
      normalizeTikTokTaskRequest(
        { contractVersion: 2, action: "remove" },
        () => GENERATED_ID
      )
    ).toThrow("action must be publish, preflight, recover, or status");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "preflight",
          expectedHanlde: "creator",
        },
        () => GENERATED_ID
      )
    ).toThrow("request contains unknown field expectedHanlde");
    expect(() =>
      normalizeTikTokTaskRequest(
        { contractVersion: 2, action: "preflight", timeout: "420" },
        () => GENERATED_ID
      )
    ).toThrow("timeout must be an integer");
  });

  it("拒绝无效 publicationId 和账号断言", () => {
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "status",
          publicationId: "publication_001",
        },
        () => GENERATED_ID
      )
    ).toThrow("publicationId must be a UUID");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "preflight",
          expectedHandle: "bad handle",
        },
        () => GENERATED_ID
      )
    ).toThrow("expectedHandle is not a valid TikTok handle");
  });

  it("拒绝缺少发布素材、空文案和不安全路径", () => {
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          content: { title: "caption" },
        },
        () => GENERATED_ID
      )
    ).toThrow("media is required when action is publish");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          media: { mode: "direct", kind: "image", path: "/sdcard/a.jpg" },
        },
        () => GENERATED_ID
      )
    ).toThrow("content requires at least one title or details value");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          media: {
            mode: "direct",
            kind: "video",
            path: "/sdcard/../data/local/tmp/a.mp4",
          },
          content: { title: "caption" },
        },
        () => GENERATED_ID
      )
    ).toThrow("safe absolute Android path");
  });

  it("严格区分 direct 与 pool 参数", () => {
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          media: { mode: "direct", kind: "auto", path: "/sdcard/a.mp4" },
          content: { title: "caption" },
        },
        () => GENERATED_ID
      )
    ).toThrow("media.kind");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          media: {
            mode: "pool",
            kind: "image",
            paths: ["/sdcard/a.jpg"],
            directory: "/sdcard/DCIM",
          },
          content: { title: "caption" },
        },
        () => GENERATED_ID
      )
    ).toThrow("requires exactly one of paths or directory");
  });

  it("限制文案池、视频组合文案和策略边界", () => {
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          media: { mode: "direct", kind: "image", path: "/sdcard/a.jpg" },
          content: { titles: Array.from({ length: 21 }, () => "caption") },
        },
        () => GENERATED_ID
      )
    ).toThrow("more than 20");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "publish",
          media: { mode: "direct", kind: "video", path: "/sdcard/a.mp4" },
          content: { title: "title", details: "x".repeat(2196) },
        },
        () => GENERATED_ID
      )
    ).toThrow("combined video caption must not exceed 2200");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "preflight",
          policy: { maxPostsPerDay: 0 },
        },
        () => GENERATED_ID
      )
    ).toThrow("policy.maxPostsPerDay");
    expect(() =>
      normalizeTikTokTaskRequest(
        {
          contractVersion: 2,
          action: "preflight",
          link: { retrySeconds: 61 },
        },
        () => GENERATED_ID
      )
    ).toThrow("link.retrySeconds");
  });

  it("拒绝非法生成器返回值", () => {
    expect(() =>
      normalizeTikTokTaskRequest(
        { contractVersion: 2, action: "preflight" },
        () => "not-a-uuid"
      )
    ).toThrow(TikTokContractViolation);
  });
});
