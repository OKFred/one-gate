import { HTTPException } from "hono/http-exception";

export const PersonalAssetError = {
  INVALID_PLACEMENT: "PERSONAL_ASSET_INVALID_PLACEMENT",
  STATE_CONFLICT: "PERSONAL_ASSET_STATE_CONFLICT",
} as const;
const presentations = {
  PERSONAL_ASSET_INVALID_PLACEMENT: [
    400,
    "errorHandler.personal.asset.invalidPlacement",
  ],
  PERSONAL_ASSET_STATE_CONFLICT: [
    409,
    "errorHandler.personal.asset.stateConflict",
  ],
} as const;

export function personalAssetError(
  code: (typeof PersonalAssetError)[keyof typeof PersonalAssetError]
) {
  const [status, message] = presentations[code];
  return new HTTPException(status, { message, cause: { error: { code } } });
}
