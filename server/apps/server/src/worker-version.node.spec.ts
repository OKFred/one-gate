import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildFrontendVersionSource,
  buildWorkerVersion,
  replaceWorkerVersion,
} from "../../../scripts/stamp-worker-version.js";

describe("Worker deployment version", () => {
  it("combines the deployment timestamp with the commit SHA", () => {
    expect(
      buildWorkerVersion(
        "FAECE3BA90785788C7992B9453A94ADBED2BA50A",
        new Date("2026-08-22T08:59:01.000Z")
      )
    ).toBe("20260822085901-faece3ba");
    expect(() => buildWorkerVersion("not-a-sha")).toThrow(/Git SHA/);
  });

  it("updates only the VERSION entry in Wrangler JSONC", () => {
    const source = `{
      "vars": {
        "VERSION": "old-version",
        "NODE_ENV": "production"
      }
    }`;
    expect(replaceWorkerVersion(source, "new-version")).toContain(
      '"VERSION": "new-version"'
    );
    expect(replaceWorkerVersion(source, "new-version")).toContain(
      '"NODE_ENV": "production"'
    );
    expect(() => replaceWorkerVersion("{}", "new-version")).toThrow(/missing/);
  });

  it("writes the same public version shape consumed by Pages", () => {
    expect(buildFrontendVersionSource("20260822102505-5de7e790")).toBe(
      '{"version":"20260822102505-5de7e790"}\n'
    );
  });

  it("keeps an unconfigured public build marked as local development", () => {
    const config = readFileSync(
      resolve(import.meta.dirname, "../wrangler.jsonc"),
      "utf8"
    );
    expect(config).toContain('"VERSION": "local-development"');
  });

  it("does not commit a version derived from the previous HEAD", () => {
    const hook = readFileSync(
      resolve(import.meta.dirname, "../../../../hooks/pre-commit"),
      "utf8"
    );
    expect(hook).not.toContain("platform/public/version.json");
  });
});
