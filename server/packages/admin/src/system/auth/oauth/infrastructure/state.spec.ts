import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@hodor/core/middleware/cache/index.js", () => ({ kv: mocks }));

import { kvOAuthStateAdapter, oauthStateInFlight } from "./state.js";

describe("KV OAuth state adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oauthStateInFlight.clear();
  });

  it("同 isolate 并发消费时只放行一个请求", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.get.mockImplementationOnce(async () => {
      await gate;
      return {
        provider: "github",
        intent: "login",
        redirectUri: "http://localhost:5173/oauth/callback",
        userId: null,
        expiresAtUtc: Date.now() + 60_000,
      };
    });
    const first = kvOAuthStateAdapter.consume("same-state");
    await Promise.resolve();
    await expect(kvOAuthStateAdapter.consume("same-state")).resolves.toBeNull();
    release?.();
    await expect(first).resolves.toMatchObject({ provider: "github" });
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });
});
