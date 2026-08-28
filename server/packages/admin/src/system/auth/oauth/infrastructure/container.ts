import { getEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import { OAuthCenter } from "../application/oauth-center.js";
import { OAuthError, OAuthErrorCode } from "../domain/oauth.js";
import { webCryptoOAuthCipher } from "./cipher.js";
import { githubOAuthProvider } from "./providers/github.js";
import { feishuOAuthProvider } from "./providers/feishu.js";
import { drizzleOAuthBindingRepository } from "./repository.js";
import { drizzleOAuthStateAdapter } from "./state.js";

function allowedRedirectOrigins(): string[] {
  const raw = getEnv("OAUTH_ALLOWED_REDIRECT_ORIGINS");
  const values = raw
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (!values?.length) {
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
      "Missing OAUTH_ALLOWED_REDIRECT_ORIGINS"
    );
  }
  try {
    return values.map((value) => new URL(value).origin);
  } catch {
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
      "OAUTH_ALLOWED_REDIRECT_ORIGINS contains an invalid origin"
    );
  }
}

let center: OAuthCenter | null = null;

export function getOAuthCenter(): OAuthCenter {
  if (!center) {
    center = new OAuthCenter({
      state: drizzleOAuthStateAdapter,
      repository: drizzleOAuthBindingRepository,
      cipher: webCryptoOAuthCipher,
      clock: { now: () => Date.now() },
      tokenIssuer: {
        issue: (user) =>
          tokenUtils.generateToken({
            userId: user.id,
            username: user.username,
          }),
      },
      providers: {
        github: githubOAuthProvider,
        feishu: feishuOAuthProvider,
      },
      allowedRedirectOrigins,
    });
  }
  return center;
}
