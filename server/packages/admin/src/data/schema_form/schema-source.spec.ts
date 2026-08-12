import { describe, expect, it } from "vitest";
import { mergeSchemaSources } from "./schema-source";

describe("mergeSchemaSources", () => {
  it("uses registered schemas when D1 has no matching rows", () => {
    const merged = mergeSchemaSources(
      new Map([
        [
          "admin.mobile.device.add.req",
          {
            type: "object",
            description: "removed",
            properties: { clientId: { type: "string", example: "device-1" } },
          },
        ],
      ]),
      []
    );

    expect(
      JSON.parse(merged.get("admin.mobile.device.add.req") ?? "null")
    ).toEqual({
      type: "object",
      properties: { clientId: { type: "string" } },
    });
  });

  it("lets a stored schema override a registered schema with the same code", () => {
    const code = "admin.mobile.device.add.req";
    const merged = mergeSchemaSources(new Map([[code, { type: "object" }]]), [
      { code, schemaData: JSON.stringify({ type: "string" }) },
    ]);

    expect(JSON.parse(merged.get(code) ?? "null")).toEqual({ type: "string" });
  });

  it("preserves invalid stored data for the existing downstream behavior", () => {
    const merged = mergeSchemaSources(new Map(), [
      { code: "custom.invalid", schemaData: "not-json" },
    ]);

    expect(merged.get("custom.invalid")).toBe("not-json");
  });

  it("keeps a valid registered schema when the stored override is invalid", () => {
    const code = "admin.mobile.device.add.req";
    const merged = mergeSchemaSources(new Map([[code, { type: "object" }]]), [
      { code, schemaData: "not-json" },
    ]);

    expect(JSON.parse(merged.get(code) ?? "null")).toEqual({
      type: "object",
    });
  });
});
