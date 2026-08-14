import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

describe("mobile client release route whitelist", () => {
  it("exposes only the machine-token upload entry points", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL(
          "../../../packages/core/src/middleware/encapsulation/index.ts",
          import.meta.url
        )
      ),
      "utf8"
    );

    expect(source).toContain('"/admin/mobile/client-release/upload/prepare"');
    expect(source).toContain('"/admin/mobile/client-release/upload/finalize"');
    expect(source).not.toContain('"/admin/mobile/client-release/list"');
    expect(source).not.toContain('"/admin/mobile/client-release/revoke"');
  });
});
