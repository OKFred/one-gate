import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getEnv, setEnv } from "@hodor/core/utils/env";
import createApp from "../../../../../apps/server/src/index";
import { CALENDAR_SUBSCRIPTION_PATH } from "./model";
import { getSubscriptionRepository } from "./repository";

vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));

describe("private ICS production application registration", () => {
  const originalEnv = {
    BASE_API_PATH: getEnv("BASE_API_PATH"),
    NODE_ENV: getEnv("NODE_ENV"),
    STATIC_FILE_PATH: getEnv("STATIC_FILE_PATH"),
    CALENDAR_SUBSCRIPTION_ORIGIN: getEnv("CALENDAR_SUBSCRIPTION_ORIGIN"),
  };
  const staticMarker = "synthetic-static-calendar-must-never-be-served";
  const fixturePrefix = "one-gate-calendar-subscription-static-";
  let fixtureDirectory: string;
  beforeAll(async () => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), fixturePrefix));
    await writeFile(
      join(fixtureDirectory, "calendar-subscription.ics"),
      staticMarker,
      "utf8"
    );
    await writeFile(
      join(fixtureDirectory, "ordinary.txt"),
      "ordinary static",
      "utf8"
    );
  });
  beforeEach(() => {
    setEnv({
      BASE_API_PATH: "/api/v1",
      NODE_ENV: "production",
      STATIC_FILE_PATH: fixtureDirectory,
      CALENDAR_SUBSCRIPTION_ORIGIN: "https://calendar.example.test",
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => {
    setEnv(originalEnv);
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    const target = resolve(fixtureDirectory);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith(fixturePrefix)
    )
      throw Error("Refusing to remove an unowned static test directory");
    await rm(target, { recursive: true, force: true });
  });

  it("checks the exact read-only protocol before a same-name static file while retaining ordinary static and health routes", async () => {
    const credential = vi.spyOn(getSubscriptionRepository(), "credential");
    const feed = vi.spyOn(getSubscriptionRepository(), "feed");
    const app = createApp({
      resolveTotpGateCenter: () => {
        throw Error(
          "This protocol and public resource test must not resolve a user session"
        );
      },
    });
    for (const [path, method, expectedStatus] of [
      [CALENDAR_SUBSCRIPTION_PATH, "GET", 400],
      [CALENDAR_SUBSCRIPTION_PATH + "?token=invalid", "GET", 401],
      [CALENDAR_SUBSCRIPTION_PATH, "HEAD", 400],
      [CALENDAR_SUBSCRIPTION_PATH, "POST", 405],
      [CALENDAR_SUBSCRIPTION_PATH + "/nested", "GET", 404],
    ] as const) {
      const response = await app.request(path, { method });
      expect(response.status).toBe(expectedStatus);
      expect(await response.text()).not.toContain(staticMarker);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(credential).not.toHaveBeenCalled();
    expect(feed).not.toHaveBeenCalled();
    const ordinary = await app.request("/ordinary.txt");
    expect(ordinary.status).toBe(200);
    expect(await ordinary.text()).toBe("ordinary static");
    const health = await app.request("/healthCheck");
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({
      ok: true,
      message: "I am OK!",
    });
  });

  it("never serves the static snapshot when subscription configuration is disabled", async () => {
    setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: "" });
    const app = createApp({
      resolveTotpGateCenter: () => {
        throw Error("Disabled protocol must not resolve a user session");
      },
    });
    const response = await app.request(CALENDAR_SUBSCRIPTION_PATH);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(staticMarker);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
