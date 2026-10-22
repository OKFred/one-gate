import { describe, expect, it, vi } from "vitest";
import {
  ServiceRegistry,
  isAdminRegistryInitialized,
  registry,
  setRegistry,
} from "./common/registry.js";
import {
  ensureAdminRegistry,
  initAdminRegistry,
  systemRegister,
} from "./register.js";
import createAdminApp from "./index.js";

describe("shared service bootstrap", () => {
  it("installs services once before any HTTP application is constructed", () => {
    expect(isAdminRegistryInitialized()).toBe(false);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      ensureAdminRegistry();
      ensureAdminRegistry();
      expect(isAdminRegistryInitialized()).toBe(true);
      expect(registry.system).toBe(systemRegister);
      expect(typeof registry.base.httpFetch.fetch).toBe("function");
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(log.mock.calls[0][0]).event).toBe(
        "admin.registry.initialized"
      );
    } finally {
      log.mockRestore();
    }
  });

  it("preserves explicit overrides while allowing deliberate reinitialization", () => {
    const custom = new ServiceRegistry();
    const systemOverride = { ...systemRegister };
    custom.register("system", systemOverride);
    setRegistry(custom);
    try {
      ensureAdminRegistry();
      createAdminApp({
        resolveTotpGateCenter: () => {
          throw new Error(
            "Authentication is not part of this construction test"
          );
        },
      });
      expect(registry.system).toBe(systemOverride);
      expect(() => registry.base).toThrow("not registered yet");
    } finally {
      initAdminRegistry();
    }
    expect(registry.system).toBe(systemRegister);
    expect(typeof registry.base.httpFetch.fetch).toBe("function");
  });
});
