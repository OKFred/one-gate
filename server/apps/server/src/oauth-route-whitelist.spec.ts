import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

describe("public authentication route whitelist", () => {
  it("exposes only the unified OAuth login entry points", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL(
          "../../../packages/core/src/middleware/encapsulation/index.ts",
          import.meta.url
        )
      ),
      "utf8"
    );

    expect(source).toContain('"/admin/system/auth/oauth/login/url"');
    expect(source).toContain('"/admin/system/auth/oauth/login/callback"');
    expect(source).not.toContain('"/admin/system/auth/github/url"');
    expect(source).not.toContain('"/admin/system/auth/github/login"');
    expect(source).not.toContain('"/admin/system/auth/oauth/account/url"');
    expect(source).not.toContain('"/admin/system/auth/oauth/account/callback"');
  });
});
