import { kv } from "../cache";

/** Permission bundles compare this opaque version before using cached scopes. */
export async function invalidateAuthCache(): Promise<void> {
  try {
    await kv.put("system.auth:global_version", crypto.randomUUID());
  } catch {
    console.error(
      JSON.stringify({
        event: "auth.cache.invalidation_failed",
        level: "error",
      })
    );
  }
}
