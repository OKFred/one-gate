import type { App, Context } from "../../types/app";
import pino from "pino";
import { getRuntimeKey } from "hono/adapter";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;

export interface HodorRequestLogEvent {
  readonly timestamp: string;
  readonly level: "info";
  readonly service: "hodor-server";
  readonly event: "http.request.completed";
  readonly requestId: string;
  readonly method: string;
  readonly route: string;
  readonly status: number;
  readonly durationMs: number;
}

export interface HodorRequestLogger {
  info(event: HodorRequestLogEvent): void;
}

export interface HodorLoggerOptions {
  readonly clock?: { now(): number };
  readonly createRequestId?: () => string;
  readonly logger?: HodorRequestLogger;
}

const defaultLogger: HodorRequestLogger = {
  info(event): void {
    console.log(JSON.stringify(event));
  },
};

const createSafeRequestId = (
  incoming: string | undefined,
  createRequestId: () => string
): string => {
  if (incoming !== undefined && REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }
  const generated = createRequestId();
  return REQUEST_ID_PATTERN.test(generated) ? generated : crypto.randomUUID();
};

const resolveRoute = (context: Context): string =>
  context.req.routePath === "/*" || context.req.routePath.length === 0
    ? "unmatched"
    : context.req.routePath;

export default function logHandler(app: App, options: HodorLoggerOptions = {}) {
  const clock = options.clock ?? { now: () => Date.now() };
  const createRequestId =
    options.createRequestId ?? (() => crypto.randomUUID());
  const logger = options.logger ?? defaultLogger;

  app.use("*", async (context, next) => {
    const startedAt = clock.now();
    const requestId = createSafeRequestId(
      context.req.header(REQUEST_ID_HEADER),
      createRequestId
    );
    context.set("requestId", requestId);
    await next();
    context.header(REQUEST_ID_HEADER, requestId);
    logger.info({
      timestamp: new Date(clock.now()).toISOString(),
      level: "info",
      service: "hodor-server",
      event: "http.request.completed",
      requestId,
      method: context.req.method,
      route: resolveRoute(context),
      status: context.res.status,
      durationMs: Math.max(0, clock.now() - startedAt),
    });
  });

  if (getRuntimeKey() !== "node") return;
  const nodeLogger = pino({
    base: { service: "hodor-server" },
    level: "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  app.use("*", async (context, next) => {
    context.set(
      "logger",
      nodeLogger.child({ requestId: context.get("requestId") })
    );
    await next();
  });
}
