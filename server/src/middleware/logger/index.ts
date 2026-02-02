import type { App } from "@/types/app.ts";
import { pinoLogger } from "hono-pino";
import type { DebugLogOptions } from "hono-pino/debug-log";
import pino from "pino";
import { requestId } from "hono/request-id";
import path from "path";

const options: DebugLogOptions = {
  colorEnabled: true,
  httpLogFormat:
    "[{time}] {levelLabel}  - {reqId} {req.method} {req.url} {res.status} - {msg} ({responseTime}ms)",
};

export default function logHandler(app: App) {
  const logDir = path.join(process.cwd(), "logs");
  const logFile = path.join(logDir, "access.log");
  app.use(requestId());
  app.use(
    pinoLogger({
      pino: pino({
        base: null,
        level: "info",
        transport: {
          targets: [
            {
              target: "hono-pino/debug-log",
              options,
            } /* 
            {
              target: "pino-roll",
              options: {
                size: "5m",
                file: logFile,
                frequency: "daily",
                dateFormat: "yyyy-MM-dd",
                limit: {
                  count: 33,
                },
                mkdir: true,
              },
            }, */,
          ],
        },
        timestamp: pino.stdTimeFunctions.epochTime, // hh:mm:ss.sss
      }),
    })
  );
}
