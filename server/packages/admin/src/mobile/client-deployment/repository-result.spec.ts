import { describe, expect, it } from "vitest";

import { didMutationAffectRows } from "./repository.js";

describe("client deployment mutation result", () => {
  it("supports LibSQL and Cloudflare D1 affected-row metadata", () => {
    expect(didMutationAffectRows({ rowsAffected: 1 })).toBe(true);
    expect(didMutationAffectRows({ rowsAffected: 0 })).toBe(false);
    expect(didMutationAffectRows({ meta: { changes: 1 } })).toBe(true);
    expect(didMutationAffectRows({ meta: { changes: 0 } })).toBe(false);
    expect(didMutationAffectRows(undefined)).toBe(false);
  });
});
