import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
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

  it("stamps the Worker config before the deploy action", () => {
    const workflow = readFileSync(
      resolve(import.meta.dirname, "../../../../.github/workflows/test.yml"),
      "utf8"
    );
    const stampAt = workflow.indexOf("Stamp Worker Version");
    const deployAt = workflow.indexOf("Deploy Workers Backend");
    expect(stampAt).toBeGreaterThan(0);
    expect(deployAt).toBeGreaterThan(stampAt);
  });
});
