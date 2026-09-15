import { describe, expect, it, vi } from "vitest";
import {
  RecycleBinRegistry,
  isRecycleBinResourceType,
  type RecycleBinMutation,
  type RecycleBinResourceAdapter,
} from "./recycle-bin";

function resource(resourceType: string): RecycleBinResourceAdapter {
  return {
    resourceType,
    labelKey: "test.resource",
    can: vi.fn(async () => true),
    list: vi.fn(async () => ({ total: 0, list: [] })),
    restore: vi.fn(async (input: RecycleBinMutation) => input.id),
    purge: vi.fn(async (input: RecycleBinMutation) => input.id),
    purgeExpired: vi.fn(async () => ({
      deletedCount: 0,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    })),
  };
}

describe("explicit recycle-bin registry", () => {
  it("contains only resources registered by its composition root", () => {
    const registry = new RecycleBinRegistry();
    expect(registry.list()).toEqual([]);
    expect(registry.get("system_user")).toBeUndefined();
    expect(registry.get("constructor")).toBeUndefined();
    const first = resource("department");
    const second = resource("documents.archived");
    registry.register(first);
    registry.register(second);
    expect(registry.get("department")).toBe(first);
    expect(registry.list()).toEqual([first, second]);
    expect(new RecycleBinRegistry().get("department")).toBeUndefined();
  });

  it("allows idempotent composition but cannot replace an existing adapter", () => {
    const registry = new RecycleBinRegistry();
    const first = resource("department");
    registry.register(first);
    registry.register(first);
    expect(registry.list()).toHaveLength(1);
    expect(() => registry.register(resource("department"))).toThrow(
      "Conflicting recycle-bin resource registration"
    );
    expect(registry.get("department")).toBe(first);
  });

  it.each([
    "",
    "Department",
    "../department",
    "__proto__",
    "a;drop",
    "a b",
    "department\n",
    "department\r\n",
    "a".repeat(65),
  ])("rejects invalid logical resource key %j before registration", (key) => {
    const registry = new RecycleBinRegistry();
    expect(isRecycleBinResourceType(key)).toBe(false);
    expect(() => registry.register(resource(key))).toThrow(
      "Invalid recycle-bin resource type"
    );
    expect(registry.get(key)).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });
});
