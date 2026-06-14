import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import mailActionService from "./action/service";
import * as mailAccountRepository from "./account/repository";
import * as mailTemplateRepository from "./template/repository";
import * as mailLogRepository from "./log/repository";

// 静态导入 SQL 文件文本
import accountSql from "@/db/sql/mail_account.sql?raw";
import templateSql from "@/db/sql/mail_template.sql?raw";
import logSql from "@/db/sql/mail_log.sql?raw";

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
  const testTables = ["mail_account", "mail_template", "mail_log"];

  beforeAll(async () => {
    // 使用辅助工具动态建表
    await setupTestDb(db, [accountSql, templateSql, logSql]);
  });

  afterEach(async () => {
    // 使用辅助工具清空表数据
    await clearTestData(db, testTables);
  });

  describe("Mock 模式全链路测试", () => {
    it("Mock 模式发送邮件，应该成功并将日志录入数据库", async () => {
      // 1. 插入 Mock 发信账户
      const mockPasswordBase64 =
        Buffer.from("mock_password").toString("base64");
      const accountId = await mailAccountRepository.onInsert({
        mailAddress: "mock-sender@example.com",
        password: mockPasswordBase64,
        nickname: "Mock Sender",
        host: "smtp.example.com",
        port: 465,
        isEnabled: true,
        creatorId: 1,
      });

      // 2. 插入 Mock 邮件模板
      const templateId = await mailTemplateRepository.onInsert({
        name: "mock_template",
        title: "Hello {{name}}",
        langCode: "zh-CN",
        content: "Welcome, your code is {{code}}",
        isEnabled: true,
        creatorId: 1,
      });

      // 3. 调用 send action
      const userObj = { userId: 1 } as any;
      const sendRes = await mailActionService.send.service(
        {
          accountId: accountId!,
          templateId: templateId!,
          receiverArr: [
            { name: "Mock Receiver", address: "mock-receiver@example.com" },
          ],
          templateParams: { name: "Antigravity", code: "9527" },
        },
        userObj
      );

      // 4. 验证接口返回
      expect(sendRes.accepted).toEqual([
        {
          name: "mock-receiver@example.com",
          address: "mock-receiver@example.com",
        },
      ]);
      expect(sendRes.logId).toBeGreaterThan(0);

      // 5. 验证数据库中的邮件日志
      const log = await mailLogRepository.findById(sendRes.logId);
      expect(log).not.toBeNull();
      expect(log!.sendStatus).toBe(true);
      expect(log!.mailFrom).toBe("mock-sender@example.com");
      expect(log!.mailTo).toBe("mock-receiver@example.com");
      expect(log!.title).toBe("Hello Antigravity");
      expect(log!.templateId).toBe(String(templateId));
    });

    it("Mock 模式下验证邮箱连接，应该返回 true", async () => {
      const accountId = await mailAccountRepository.onInsert({
        mailAddress: "mock-verify@example.com",
        password: "base64password",
        nickname: "Verify Nick",
        host: "smtp.example.com",
        port: 587,
        isEnabled: true,
        creatorId: 1,
      });

      const res = await mailActionService.verify.service({
        accountId: accountId!,
      });
      expect(res).toBe(true);
    });
  });

  // 只有当提供了真实的 TEST_MAIL_ADDRESS 时才运行真实邮件发送测试
  describe.runIf(!!process.env.TEST_MAIL_ADDRESS)(
    "真实发送模式全链路测试",
    () => {
      it("应该成功发送真实邮件并录入日志", async () => {
        const realAddress = process.env.TEST_MAIL_ADDRESS as string;
        const realPassword = process.env.TEST_MAIL_PASSWORD as string;
        const realHost = process.env.TEST_MAIL_HOST as string;
        const realPort = Number(process.env.TEST_MAIL_PORT || 465);
        const receiver = process.env.TEST_MAIL_RECEIVER as string;

        const accountId = await mailAccountRepository.onInsert({
          mailAddress: realAddress,
          password: realPassword,
          nickname: "Real Sender Test",
          host: realHost,
          port: realPort,
          isEnabled: true,
          creatorId: 1,
        });

        // 2. 发送真实邮件
        const sendRes = await mailActionService.send.service(
          {
            accountId: accountId!,
            receiverArr: [{ name: "Tester", address: receiver }],
            subject: "OkFred Integrations Test Mail (Node.js)",
            html: "<h3>Hello! This is a test mail from OkFred Node.js Integration.</h3>",
          },
          { userId: 1 } as any
        );

        expect(sendRes.accepted.length).toBeGreaterThan(0);
        expect(sendRes.logId).toBeGreaterThan(0);

        // 3. 验证日志
        const log = await mailLogRepository.findById(sendRes.logId);
        expect(log).not.toBeNull();
        expect(log!.sendStatus).toBe(true);
        expect(log!.mailFrom).toBe(realAddress);
      });

      it("真实模式下验证邮箱连接，正确的凭证应该返回 true", async () => {
        const realAddress = process.env.TEST_MAIL_ADDRESS as string;
        const realPassword = process.env.TEST_MAIL_PASSWORD as string;
        const realHost = process.env.TEST_MAIL_HOST as string;
        const realPort = Number(process.env.TEST_MAIL_PORT || 465);

        const accountId = await mailAccountRepository.onInsert({
          mailAddress: realAddress,
          password: realPassword,
          nickname: "Real Sender Test",
          host: realHost,
          port: realPort,
          isEnabled: true,
          creatorId: 1,
        });

        const res = await mailActionService.verify.service({
          accountId: accountId!,
        });
        expect(res).toBe(true);
      });

      it("真实模式下验证邮箱连接，错误的密码应该抛出错误", async () => {
        const realAddress = process.env.TEST_MAIL_ADDRESS as string;
        const wrongPassword = (process.env.TEST_MAIL_WRONG_PASSWORD ||
          "wrong_pass") as string;
        const realHost = process.env.TEST_MAIL_HOST as string;
        const realPort = Number(process.env.TEST_MAIL_PORT || 465);

        const accountId = await mailAccountRepository.onInsert({
          mailAddress: realAddress,
          password: wrongPassword,
          nickname: "Real Sender Test",
          host: realHost,
          port: realPort,
          isEnabled: true,
          creatorId: 1,
        });

        await expect(
          mailActionService.verify.service({ accountId: accountId! })
        ).rejects.toThrow();
      });
    }
  );
});
