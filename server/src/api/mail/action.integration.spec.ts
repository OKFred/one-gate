/// <reference types="@cloudflare/vitest-pool-workers/types" />
import { describe, vi } from "vitest";
import { env } from "cloudflare:workers";
import { setD1Binding } from "@/db/index";
import { runMailActionIntegrationTests } from "./action.integration.shared";

vi.mock("pino", () => {
  const noop = () => {};
  const logger = {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    child: () => logger,
  };
  const mockPino = () => logger;
  (mockPino as any).stdTimeFunctions = {
    epochTime: () => 0,
  };
  return {
    default: mockPino,
    pino: mockPino,
  };
});

vi.mock("nodemailer", () => {
  return {
    default: {
      createTransport: () => ({
        sendMail: async () => ({ accepted: [], rejected: [] }),
        verify: async () => true,
      }),
    },
  };
});

// 拦截并 Mock worker-mailer，实现条件透传
vi.mock("worker-mailer", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    WorkerMailer: {
      send: async (transport: any, message: any) => {
        const hasCredentials = !!(
          transport.credentials.username &&
          !transport.credentials.username.includes("example.com")
        );
        if (hasCredentials) {
          return await actual.WorkerMailer.send(transport, message);
        }
        return true;
      },
      connect: async (transport: any) => {
        const hasCredentials = !!(
          transport.credentials.username &&
          !transport.credentials.username.includes("example.com")
        );
        if (hasCredentials) {
          return await actual.WorkerMailer.connect(transport);
        }
        return true;
      },
    },
  };
});

describe("Mail Action Workers 全链路集成测试", () => {
  runMailActionIntegrationTests({
    runtime: "Workers",
    getEnv: () => env,
    beforeAllHook: () => {
      // 绑定 D1 数据库
      setD1Binding(env.DB);
    },
  });
});
