import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import * as model from "./model";
import { calendarSubscriptionOrigin } from "./configuration";
import {
  calendarSubscriptionHash,
  newCalendarSubscriptionToken,
} from "./credential";
import { SubscriptionError, subscriptionError } from "./errors";
import { getSubscriptionRepository } from "./repository";

function ownerId(actor: UserObj | undefined): number {
  if (!actor) throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  if (
    actor.principal?.kind !== "user" ||
    !Number.isSafeInteger(actor.principal.userId) ||
    actor.principal.userId <= 0
  )
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return actor.principal.userId;
}
export async function subscriptionStatus(
  _params: model.CalendarSubscriptionStatusRequest,
  actor: UserObj | undefined
): Promise<model.CalendarSubscriptionStatus> {
  const row = await getSubscriptionRepository().find(ownerId(actor));
  return {
    configured: calendarSubscriptionOrigin() !== null,
    enabled: row?.tokenHash != null,
    version: row?.version ?? null,
    updatedTimeUtc: row?.updateTimeUtc ?? null,
  };
}
export async function rotateSubscription(
  params: model.CalendarSubscriptionMutationRequest,
  actor: UserObj | undefined
): Promise<model.CalendarSubscriptionRotation> {
  const owner = ownerId(actor);
  const origin = calendarSubscriptionOrigin();
  if (!origin) throw subscriptionError(SubscriptionError.UNAVAILABLE);
  const token = newCalendarSubscriptionToken();
  const row = await getSubscriptionRepository().change(
    owner,
    params.expectedVersion,
    await calendarSubscriptionHash(token),
    Date.now()
  );
  if (!row) throw subscriptionError(SubscriptionError.STATE_CONFLICT);
  return {
    version: row.version,
    updatedTimeUtc: row.updateTimeUtc,
    subscriptionUrl: `${origin}${model.CALENDAR_SUBSCRIPTION_PATH}?token=${token}`,
  };
}
export async function revokeSubscription(
  params: model.CalendarSubscriptionMutationRequest,
  actor: UserObj | undefined
): Promise<model.CalendarSubscriptionMutation> {
  const row = await getSubscriptionRepository().change(
    ownerId(actor),
    params.expectedVersion,
    null,
    Date.now()
  );
  if (!row) throw subscriptionError(SubscriptionError.STATE_CONFLICT);
  return { version: row.version, updatedTimeUtc: row.updateTimeUtc };
}
export default {
  status: {
    req: model.CalendarSubscriptionStatusRequestSchema,
    res: model.CalendarSubscriptionStatusResponseSchema,
    pathInfo: {
      path: "/status",
      method: "post",
      summary: "Read private calendar subscription status",
    },
    adapter: bodyUserAdapter,
    service: subscriptionStatus,
    permission: false,
  },
  rotate: {
    req: model.CalendarSubscriptionMutationRequestSchema,
    res: model.CalendarSubscriptionRotateResponseSchema,
    pathInfo: {
      path: "/rotate",
      method: "post",
      summary: "Rotate a private read-only calendar subscription",
    },
    adapter: bodyUserAdapter,
    service: rotateSubscription,
    permission: false,
  },
  revoke: {
    req: model.CalendarSubscriptionMutationRequestSchema,
    res: model.CalendarSubscriptionMutationResponseSchema,
    pathInfo: {
      path: "/revoke",
      method: "post",
      summary: "Revoke a private calendar subscription",
    },
    adapter: bodyUserAdapter,
    service: revokeSubscription,
    permission: false,
  },
} satisfies Record<string, API>;
