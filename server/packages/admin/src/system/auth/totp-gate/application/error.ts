import type { TotpGateErrorCode } from "../domain/totp-gate.js";

export class TotpGateApplicationError extends Error {
  constructor(readonly code: TotpGateErrorCode) {
    super(code);
    Object.setPrototypeOf(this, TotpGateApplicationError.prototype);
  }
}
