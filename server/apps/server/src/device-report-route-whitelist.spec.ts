import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

describe("mobile device report route whitelist", () => {
  it("exposes all device-token report entry points before user authentication", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL(
          "../../../packages/core/src/middleware/encapsulation/index.ts",
          import.meta.url
        )
      ),
      "utf8"
    );

    expect(source).toContain('"/admin/mobile/device/report/presence"');
    expect(source).toContain('"/admin/mobile/device/report/info"');
    expect(source).toContain('"/admin/mobile/device/report/event"');
    expect(source).toContain('"/admin/mobile/device/report/deployment"');
    expect(source).toContain('"/admin/mobile/device/report/network-routing"');
  });
});
