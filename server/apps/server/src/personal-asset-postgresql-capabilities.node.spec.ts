import { describe, expect, it } from "vitest";
import { supportsPostgresPath } from "./postgresql-capabilities";

describe("personal asset PostgreSQL capability boundary", () => {
  it("opens only the two implemented actions", () => {
    expect(supportsPostgresPath("/personal/asset/overview")).toBe(true);
    expect(supportsPostgresPath("/personal/asset/place")).toBe(true);
    for (const path of [
      "/personal/asset",
      "/personal/asset/",
      "/personal/asset/list",
      "/personal/asset/place/nested",
      "/personal/asset/overview/",
      "/personal/asset-admin/overview",
      "/personal/health/list",
    ])
      expect(supportsPostgresPath(path)).toBe(false);
  });
});
