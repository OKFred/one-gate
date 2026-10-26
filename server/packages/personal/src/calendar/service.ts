import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import * as model from "./model";
import { CalendarError, calendarError } from "./errors";
import { getCalendarRepository } from "./repository";

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

function isTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
}

function editable(
  input: model.CalendarAddRequest | model.CalendarUpdateRequest
): model.CalendarEditable {
  const value: model.CalendarEditable = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    url: input.url?.trim() || null,
    startTimeUtc: input.startTimeUtc,
    endTimeUtc: input.endTimeUtc ?? null,
    timeZone: input.timeZone,
    reminderTimeUtc: input.reminderTimeUtc ?? null,
  };
  if (
    !value.title ||
    value.title.length > 160 ||
    (value.description?.length ?? 0) > 4000 ||
    (value.url?.length ?? 0) > 2048 ||
    !isTimestamp(value.startTimeUtc) ||
    (value.endTimeUtc !== null &&
      (!isTimestamp(value.endTimeUtc) ||
        value.endTimeUtc < value.startTimeUtc)) ||
    (value.reminderTimeUtc !== null &&
      (!isTimestamp(value.reminderTimeUtc) ||
        value.reminderTimeUtc > value.startTimeUtc))
  )
    throw calendarError(CalendarError.INVALID_INPUT);
  try {
    if (!value.timeZone || value.timeZone.length > 100)
      throw new Error("Invalid time zone");
    new Intl.DateTimeFormat("en-US", { timeZone: value.timeZone });
    if (value.url && !["http:", "https:"].includes(new URL(value.url).protocol))
      throw new Error("Invalid URL");
  } catch {
    throw calendarError(CalendarError.INVALID_INPUT);
  }
  return value;
}

function toEvent(row: model.CalendarEventRecord): model.CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    url: row.url,
    startTimeUtc: row.startTimeUtc,
    endTimeUtc: row.endTimeUtc,
    timeZone: row.timeZone,
    reminderTimeUtc: row.reminderTimeUtc,
    reminderAcknowledgedTimeUtc: row.reminderAcknowledgedTimeUtc,
    status: row.status,
    version: row.version,
    createTimeUtc: row.createTimeUtc,
    updateTimeUtc: row.updateTimeUtc,
  };
}

async function missingOrConflict(owner: number, id: string): Promise<never> {
  const exists = await getCalendarRepository().find(owner, id);
  throw calendarError(
    exists ? CalendarError.STATE_CONFLICT : CalendarError.NOT_FOUND
  );
}

export async function listCalendarEvents(
  params: model.CalendarListRequest,
  actor: UserObj | undefined
): Promise<model.CalendarListResponse> {
  const owner = ownerId(actor);
  if (
    !isTimestamp(params.fromTimeUtc) ||
    !isTimestamp(params.toTimeUtc) ||
    params.toTimeUtc <= params.fromTimeUtc ||
    params.toTimeUtc - params.fromTimeUtc > model.CALENDAR_MAX_RANGE_MS
  )
    throw calendarError(CalendarError.INVALID_INPUT);
  const repository = getCalendarRepository();
  const [rows, upcoming] = await Promise.all([
    repository.list(
      owner,
      params.fromTimeUtc,
      params.toTimeUtc,
      model.CALENDAR_LIST_LIMIT + 1
    ),
    repository.upcoming(owner, Date.now(), model.CALENDAR_UPCOMING_LIMIT),
  ]);
  return {
    list: rows.slice(0, model.CALENDAR_LIST_LIMIT).map(toEvent),
    hasMore: rows.length > model.CALENDAR_LIST_LIMIT,
    upcoming: upcoming.map(toEvent),
  };
}

export async function getCalendarEvent(
  params: model.CalendarGetRequest,
  actor: UserObj | undefined
): Promise<model.CalendarEvent> {
  const row = await getCalendarRepository().find(ownerId(actor), params.id);
  if (!row) throw calendarError(CalendarError.NOT_FOUND);
  return toEvent(row);
}

export async function addCalendarEvent(
  params: model.CalendarAddRequest,
  actor: UserObj | undefined
): Promise<model.CalendarEvent> {
  const owner = ownerId(actor);
  const data = editable(params);
  const now = Date.now();
  const repository = getCalendarRepository();
  const inserted = await repository.insert({
    ...data,
    id: crypto.randomUUID(),
    ownerUserId: owner,
    requestKey: params.requestKey,
    reminderAcknowledgedTimeUtc: null,
    status: "active",
    version: 1,
    createTimeUtc: now,
    updateTimeUtc: now,
  });
  if (inserted) return toEvent(inserted);
  const existing = await repository.findRequest(owner, params.requestKey);
  if (
    !existing ||
    !Object.entries(data).every(
      ([key, value]) => existing[key as keyof model.CalendarEditable] === value
    )
  )
    throw calendarError(CalendarError.REQUEST_CONFLICT);
  return toEvent(existing);
}

export async function updateCalendarEvent(
  params: model.CalendarUpdateRequest,
  actor: UserObj | undefined
): Promise<model.CalendarEvent> {
  const owner = ownerId(actor);
  const row = await getCalendarRepository().update(
    owner,
    params.id,
    params.expectedVersion,
    editable(params),
    Date.now()
  );
  if (!row) return missingOrConflict(owner, params.id);
  return toEvent(row);
}

export async function cancelCalendarEvent(
  params: model.CalendarCancelRequest,
  actor: UserObj | undefined
): Promise<model.CalendarCancelResponse> {
  const owner = ownerId(actor);
  const id = await getCalendarRepository().cancel(
    owner,
    params.id,
    params.expectedVersion,
    Date.now()
  );
  if (!id) return missingOrConflict(owner, params.id);
  return { id };
}

export async function dueCalendarEvents(
  _params: model.CalendarDueRequest,
  actor: UserObj | undefined
): Promise<model.CalendarDueResponse> {
  const owner = ownerId(actor);
  const now = Date.now();
  const repository = getCalendarRepository();
  const [rows, nextReminderTimeUtc] = await Promise.all([
    repository.due(owner, now, model.CALENDAR_DUE_LIMIT + 1),
    repository.nextReminder(owner, now),
  ]);
  return {
    list: rows.slice(0, model.CALENDAR_DUE_LIMIT).map(toEvent),
    hasMore: rows.length > model.CALENDAR_DUE_LIMIT,
    nextReminderTimeUtc,
    serverTimeUtc: now,
  };
}

export async function acknowledgeCalendarReminder(
  params: model.CalendarAckRequest,
  actor: UserObj | undefined
): Promise<model.CalendarAckResponse> {
  const owner = ownerId(actor);
  const repository = getCalendarRepository();
  const now = Date.now();
  const row = await repository.ack(
    owner,
    params.id,
    params.expectedVersion,
    params.expectedReminderTimeUtc,
    now
  );
  if (row && row.reminderAcknowledgedTimeUtc !== null)
    return { id: row.id, acknowledgedTimeUtc: row.reminderAcknowledgedTimeUtc };
  const existing = await repository.find(owner, params.id);
  if (!existing) throw calendarError(CalendarError.NOT_FOUND);
  if (
    existing.status === "active" &&
    existing.version === params.expectedVersion &&
    existing.reminderTimeUtc === params.expectedReminderTimeUtc &&
    existing.reminderTimeUtc <= now &&
    existing.reminderAcknowledgedTimeUtc !== null
  )
    return {
      id: existing.id,
      acknowledgedTimeUtc: existing.reminderAcknowledgedTimeUtc,
    };
  throw calendarError(CalendarError.STATE_CONFLICT);
}

export default {
  list: {
    req: model.CalendarListRequestSchema,
    res: model.CalendarListResponseSchema,
    pathInfo: {
      path: "/list",
      method: "post",
      summary: "List private calendar events",
    },
    adapter: bodyUserAdapter,
    service: listCalendarEvents,
    permission: false,
  },
  get: {
    req: model.CalendarGetRequestSchema,
    res: model.CalendarEventResponseSchema,
    pathInfo: {
      path: "/get",
      method: "post",
      summary: "Read a private calendar event",
    },
    adapter: bodyUserAdapter,
    service: getCalendarEvent,
    permission: false,
  },
  add: {
    req: model.CalendarAddRequestSchema,
    res: model.CalendarEventResponseSchema,
    pathInfo: {
      path: "/add",
      method: "post",
      summary: "Create a private calendar event",
    },
    adapter: bodyUserAdapter,
    service: addCalendarEvent,
    permission: false,
  },
  update: {
    req: model.CalendarUpdateRequestSchema,
    res: model.CalendarEventResponseSchema,
    pathInfo: {
      path: "/update",
      method: "post",
      summary: "Update a private calendar event",
    },
    adapter: bodyUserAdapter,
    service: updateCalendarEvent,
    permission: false,
  },
  cancel: {
    req: model.CalendarCancelRequestSchema,
    res: model.CalendarCancelResponseSchema,
    pathInfo: {
      path: "/cancel",
      method: "post",
      summary: "Cancel a private calendar event",
    },
    adapter: bodyUserAdapter,
    service: cancelCalendarEvent,
    permission: false,
  },
  due: {
    req: model.CalendarDueRequestSchema,
    res: model.CalendarDueResponseSchema,
    pathInfo: {
      path: "/due",
      method: "post",
      summary: "Read due private calendar reminders",
    },
    adapter: bodyUserAdapter,
    service: dueCalendarEvents,
    permission: false,
  },
  ack: {
    req: model.CalendarAckRequestSchema,
    res: model.CalendarAckResponseSchema,
    pathInfo: {
      path: "/ack",
      method: "post",
      summary: "Acknowledge a private calendar reminder",
    },
    adapter: bodyUserAdapter,
    service: acknowledgeCalendarReminder,
    permission: false,
  },
} satisfies Record<string, API>;
