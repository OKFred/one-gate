import { record } from "./types";
export interface UsageConfiguration {
  accountId: string | null;
  analyticsToken: string | null;
  billingToken: string | null;
}
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export class UsageSourceError extends Error {
  constructor(
    readonly code: string,
    readonly retryTimeUtc: number | null = null
  ) {
    super(code);
    this.name = "UsageSourceError";
  }
}
const BASE = "https://api.cloudflare.com/client/v4";
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
export function retryAfter(value: string | null, now: number): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  const instant = Number.isFinite(seconds)
    ? now + Math.max(0, seconds) * 1000
    : Date.parse(value);
  return Number.isFinite(instant)
    ? Math.min(now + 86_400_000, Math.max(now + 1000, instant))
    : null;
}
export class CloudflareUsageClient {
  constructor(
    readonly config: UsageConfiguration,
    private readonly fetcher: Fetcher = (input, init) =>
      globalThis.fetch(input, init),
    private readonly deadline: number | null = null
  ) {}
  async request(
    path: string,
    source: "billing" | "analytics",
    options: { method?: "GET" | "POST"; body?: unknown; now?: number } = {}
  ): Promise<Record<string, unknown>> {
    if (
      !this.config.accountId ||
      !/^[a-f0-9]{32}$/i.test(this.config.accountId)
    )
      throw new UsageSourceError("not_configured");
    const token =
      source === "billing"
        ? this.config.billingToken
        : this.config.analyticsToken;
    if (!token) throw new UsageSourceError("not_configured");
    // Callers can only use the fixed account or GraphQL metadata endpoint. Never accept a remote URL.
    const prefix = `/accounts/${this.config.accountId}/`;
    if (path !== "/graphql" && !path.startsWith(prefix))
      throw new UsageSourceError("invalid_endpoint");
    if (path.includes("..") || path.includes("\\") || path.includes("#"))
      throw new UsageSourceError("invalid_endpoint");
    const now = options.now ?? Date.now();
    const remaining =
      this.deadline === null
        ? TIMEOUT_MS
        : Math.min(TIMEOUT_MS, this.deadline - performance.now());
    if (remaining < 200) throw new UsageSourceError("tick_budget_exhausted");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await this.fetcher(`${BASE}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel();
        throw new UsageSourceError("redirect_rejected");
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new UsageSourceError(
          response.status === 429
            ? "rate_limited"
            : response.status === 403
              ? "permission_or_capability_denied"
              : response.status === 401
                ? "authentication_failed"
                : response.status === 404 || response.status === 405
                  ? "api_unavailable"
                  : response.status >= 500
                    ? "provider_unavailable"
                    : "provider_rejected",
          retryAfter(response.headers.get("retry-after"), now)
        );
      }
      if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) {
        await response.body?.cancel();
        throw new UsageSourceError("response_too_large");
      }
      if (!response.body) throw new UsageSourceError("invalid_response");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > MAX_BYTES) {
            await reader.cancel();
            throw new UsageSourceError("response_too_large");
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const merged = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let data: unknown;
      try {
        data = JSON.parse(new TextDecoder().decode(merged));
      } catch {
        throw new UsageSourceError("invalid_response");
      }
      if (!record(data)) throw new UsageSourceError("invalid_response");
      if (data.errors != null && !Array.isArray(data.errors))
        throw new UsageSourceError("invalid_response");
      if (Array.isArray(data.errors) && data.errors.length > 0)
        throw new UsageSourceError(
          source === "analytics" ? "graphql_error" : "provider_rejected"
        );
      if (data.success === false)
        throw new UsageSourceError("provider_rejected");
      if (source === "billing" && data.success !== true)
        throw new UsageSourceError("invalid_response");
      return data;
    } catch (error) {
      if (error instanceof UsageSourceError) throw error;
      throw new UsageSourceError(
        controller.signal.aborted
          ? remaining < TIMEOUT_MS
            ? "tick_budget_exhausted"
            : "timeout"
          : "network_error"
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async graphql(
    query: string,
    variables: Record<string, unknown>,
    now: number
  ): Promise<Record<string, unknown>> {
    const response = await this.request("/graphql", "analytics", {
      method: "POST",
      body: { query, variables },
      now,
    });
    if (!record(response.data))
      throw new UsageSourceError("incomplete_response");
    return response.data;
  }
}
