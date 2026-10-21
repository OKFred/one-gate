import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

export const TenantError = {
  NOT_VISIBLE: "errorHandler.enterprise.tenant.notVisible",
  STATE_CONFLICT: "errorHandler.enterprise.tenant.stateConflict",
  KEY_CONFLICT: "errorHandler.enterprise.tenant.keyConflict",
  HUMAN_REQUIRED: "errorHandler.enterprise.tenant.humanRequired",
  PLATFORM_REQUIRED: "errorHandler.enterprise.tenant.platformRequired",
  OWNER_REQUIRED: "errorHandler.enterprise.tenant.ownerRequired",
  TOKEN_UNAVAILABLE: "errorHandler.enterprise.tenant.tokenUnavailable",
  USER_UNAVAILABLE: "errorHandler.enterprise.tenant.userUnavailable",
} as const;

export function tenantConflict(): never {
  throw new BusinessError(TenantError.STATE_CONFLICT);
}

export function isTenantBatchConflict(
  error: unknown,
  controlledAssertBatch = false
): boolean {
  let current: unknown = error;
  let marker = false;
  let malformed = false;
  for (
    let depth = 0;
    depth < 6 && typeof current === "object" && current !== null;
    depth += 1
  ) {
    if ("message" in current && typeof current.message === "string") {
      marker ||= current.message.includes("tenant_write_conflict");
      malformed ||= /malformed JSON/i.test(current.message);
    }
    if ("query" in current && typeof current.query === "string")
      marker ||= current.query.includes("tenant_write_conflict");
    current = "cause" in current ? current.cause : null;
  }
  // Both supported batch drivers can discard the failing SQL. Only the private
  // assert-batch boundary may opt into this fallback; all its other JSON reads
  // use json_valid/CASE guards, so malformed JSON can only come from assertOne.
  return malformed && (marker || controlledAssertBatch);
}
