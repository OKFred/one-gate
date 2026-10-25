import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface NativeResponse {
  status: number;
  json(): Promise<unknown>;
}
interface NativeWorker {
  dispatchFetch(url: string): Promise<NativeResponse>;
  dispose(): Promise<void>;
}
interface NativeFetchMock {
  disableNetConnect(): void;
  assertNoPendingInterceptors(): void;
  get(origin: string): {
    intercept(options: {
      path: string;
      method: string;
      headers?: Record<string, string>;
      body?: string;
    }): {
      reply(
        status: number,
        body: string,
        options: { headers: Record<string, string> }
      ): unknown;
    };
  };
}
type NativeWorkerOptions = {
  modules: true;
  cf: false;
  script: string;
  compatibilityDate: string;
  compatibilityFlags: string[];
  fetchMock?: NativeFetchMock;
  outboundService?: (request: { url: string }) => NativeResponse;
};
const fromWorkersPool = createRequire(
  import.meta.resolve("@cloudflare/vitest-pool-workers")
);
const {
  Miniflare,
  createFetchMock,
  Response: OutboundResponse,
} = fromWorkersPool("miniflare") as {
  Miniflare: new (options: NativeWorkerOptions) => NativeWorker;
  createFetchMock(): NativeFetchMock;
  Response: new (
    body: null,
    init: { status: number; headers: Record<string, string> }
  ) => NativeResponse;
};
const { buildSync } = fromWorkersPool("esbuild") as {
  buildSync(options: {
    stdin: {
      contents: string;
      resolveDir: string;
      sourcefile: string;
      loader: "ts";
    };
    bundle: true;
    write: false;
    format: "esm";
    platform: "browser";
    target: string;
  }): { outputFiles: Array<{ text: string }> };
};

// The Vitest Workers pool itself wraps global fetch in an arrow function. Run an
// independent workerd so this regression exercises the unmodified native fetch.
describe("Cloudflare usage default transport in native workerd", () => {
  let worker: NativeWorker;
  let mock: NativeFetchMock;
  let workerScript: string;
  const accountId = "a".repeat(32);
  const path = `/client/v4/accounts/${accountId}/subscriptions`;
  const expected = { success: true, result: [{ state: "synthetic" }] };

  beforeAll(() => {
    mock = createFetchMock();
    mock.disableNetConnect();
    const origin = mock.get("https://api.cloudflare.com");
    origin
      .intercept({
        path,
        method: "GET",
        headers: { authorization: "Bearer synthetic-billing-token" },
      })
      .reply(200, JSON.stringify(expected), {
        headers: { "content-type": "application/json" },
      });
    origin
      .intercept({ path: "/client/v4/graphql", method: "POST" })
      .reply(
        200,
        JSON.stringify({ data: { viewer: { accounts: [] } }, errors: null }),
        { headers: { "content-type": "application/json" } }
      );
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = `
      import { CloudflareUsageClient } from ${JSON.stringify(resolve(directory, "client.ts"))};
      const configuration = { accountId: ${JSON.stringify(accountId)}, analyticsToken: "synthetic-analytics-token", billingToken: "synthetic-billing-token" };
      export default {
        async fetch(request) {
          const mode = new URL(request.url).pathname;
          try {
            if (mode === "/native-receiver") {
              const holder = { transport: fetch };
              await holder.transport("https://api.cloudflare.com${path}");
              return Response.json({ unexpected: "native member call succeeded" });
            }
            if (mode === "/injected") {
              const client = new CloudflareUsageClient(configuration, function(input, init) {
                return Promise.resolve(Response.json({ success: true, result: { receiverIsClient: this instanceof CloudflareUsageClient, method: init.method } }));
              });
              return Response.json(await client.request("/accounts/${accountId}/subscriptions", "billing"));
            }
            const client = new CloudflareUsageClient(configuration);
            if (mode === "/redirect") return Response.json(await client.request("/accounts/${accountId}/subscriptions/redirect-probe", "billing"));
            return Response.json(mode === "/graphql"
              ? await client.graphql("{ viewer { accounts { __typename } } }", {}, Date.now())
              : await client.request("/accounts/${accountId}/subscriptions", "billing"));
          } catch (error) {
            return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
          }
        }
      };
    `;
    const bundle = buildSync({
      stdin: {
        contents: source,
        resolveDir: directory,
        sourcefile: "native-usage-transport.ts",
        loader: "ts",
      },
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2022",
    });
    workerScript = bundle.outputFiles[0].text;
    worker = new Miniflare({
      modules: true,
      cf: false,
      script: workerScript,
      compatibilityDate: "2026-03-17",
      compatibilityFlags: ["nodejs_compat"],
      fetchMock: mock,
    });
  });
  afterAll(async () => {
    await worker?.dispose();
  });

  it("demonstrates why native fetch cannot be invoked with an arbitrary receiver", async () => {
    const response = await worker.dispatchFetch(
      "http://synthetic.local/native-receiver"
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: expect.stringContaining("Illegal invocation"),
    });
  });
  it("uses the default transport for a billing GET and GraphQL POST", async () => {
    const billing = await worker.dispatchFetch(
      "http://synthetic.local/billing"
    );
    expect(await billing.json()).toEqual(expected);
    expect(billing.status).toBe(200);
    const graphql = await worker.dispatchFetch(
      "http://synthetic.local/graphql"
    );
    expect(await graphql.json()).toEqual({ viewer: { accounts: [] } });
    expect(graphql.status).toBe(200);
    mock.assertNoPendingInterceptors();
  });
  it("preserves the existing injected Fetcher invocation", async () => {
    const response = await worker.dispatchFetch(
      "http://synthetic.local/injected"
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      result: { receiverIsClient: true, method: "GET" },
    });
  });
  it("rejects redirects without forwarding account credentials to another origin", async () => {
    const requestedUrls: string[] = [];
    // fetchMock's Node bridge follows redirects itself. Return 302 directly so
    // this test exercises workerd's redirect mode without that intermediate fetch.
    const redirectWorker = new Miniflare({
      modules: true,
      cf: false,
      script: workerScript,
      compatibilityDate: "2026-03-17",
      compatibilityFlags: ["nodejs_compat"],
      outboundService: (request) => {
        requestedUrls.push(request.url);
        return new OutboundResponse(null, {
          status: 302,
          headers: {
            location: "https://unmatched.synthetic.invalid/credential-target",
          },
        });
      },
    });
    try {
      const response = await redirectWorker.dispatchFetch(
        "http://synthetic.local/redirect"
      );
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "redirect_rejected" });
      expect(requestedUrls).toEqual([
        `https://api.cloudflare.com${path}/redirect-probe`,
      ]);
    } finally {
      await redirectWorker.dispose();
    }
  });
});
