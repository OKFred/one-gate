import { kv } from "@hodor/core/middleware/cache/index.js";
import type { OAuthStatePort } from "../application/ports.js";
import type { OAuthStateRecord } from "../domain/oauth.js";

const STATE_KEY_PREFIX = "system.auth.oauth.state:";
const STATE_TTL_SECONDS = 10 * 60;
export const oauthStateInFlight = new Set<string>();

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export const kvOAuthStateAdapter: OAuthStatePort = {
  async create(record) {
    const state = randomState();
    await kv.put(`${STATE_KEY_PREFIX}${state}`, record, {
      expirationTtl: STATE_TTL_SECONDS,
    });
    return state;
  },
  async consume(state) {
    const key = `${STATE_KEY_PREFIX}${state}`;
    if (oauthStateInFlight.has(key)) return null;
    oauthStateInFlight.add(key);
    try {
      const record = await kv.get<OAuthStateRecord>(key, { type: "json" });
      if (record) await kv.delete(key);
      return record;
    } finally {
      oauthStateInFlight.delete(key);
    }
  },
};
