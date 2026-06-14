import { describe, vi } from "vitest";
import { runMailActionIntegrationTests } from "./action.integration.shared";

// 拦截并 Mock nodemailer，实现条件透传
vi.mock("nodemailer", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    default: {
      ...actual.default,
      createTransport: (config: any) => {
        const hasCredentials = !!(
          config.auth?.user && !config.auth.user.includes("example.com")
        );
        if (hasCredentials) {
          return actual.default.createTransport(config);
        }
        // 返回 mock 的 transporter
        return {
          sendMail: async (options: any) => {
            return {
              accepted: options.to.map((t: any) =>
                typeof t === "string" ? t : t.address
              ),
              rejected: [],
              messageId: "mock-message-id",
            };
          },
          verify: async () => true,
        };
      },
    },
  };
});

describe("Mail Action Node.js 全链路集成测试", () => {
  runMailActionIntegrationTests({
    runtime: "Node.js",
    getEnv: () => process.env,
  });
});
