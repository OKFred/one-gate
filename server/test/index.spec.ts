import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("Hello World worker", () => {
  it("responds with I am OK! (unit style)", async () => {
    const request = new Request("http://localhost/healthCheck");
    // Create an empty context to pass to `app.fetch()`.
    const ctx = createExecutionContext();
    const app = worker();
    const response = await app.fetch(request, env, ctx);
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    await waitOnExecutionContext(ctx);
    const json = (await response.json()) as any;
    expect(json.message).toBe("I am OK!");
  });

  it("responds with I am OK! (integration style)", async () => {
    const response = await SELF.fetch("https://example.com/healthCheck");
    const json = (await response.json()) as any;
    expect(json.message).toBe("I am OK!");
  });
});
