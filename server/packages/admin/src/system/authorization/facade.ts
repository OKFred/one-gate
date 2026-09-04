import type {
  AuthorizationDecisionInput,
  HodorAuthorizationActor,
} from "./domain/authorization.js";
import { getAuthorizationCenter } from "./infrastructure/container.js";

export interface ObserveAuthorizationShadowDecisionInput {
  readonly decision: AuthorizationDecisionInput;
  readonly actor: HodorAuthorizationActor;
  readonly requestId: string;
  readonly rbacAllowed: boolean;
}

/** Stable application facade for business slices that only need shadow decisions. */
export const observeAuthorizationShadowDecision = (
  input: ObserveAuthorizationShadowDecisionInput
) => getAuthorizationCenter().observeShadowDecision(input);
