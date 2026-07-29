import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import mailActionService from "../action/service";
import * as mailAccountRepository from "../account/repository";
import * as mailTemplateRepository from "../template/repository";
import { registry } from "../../common/registry";

// 静态导入 SQL 文件文本（Vite 支持 ?raw 后缀直接读取文本）
import accountSql from "@hodor/core/db/sql/mail_account.sql?raw";
import templateSql from "@hodor/core/db/sql/mail_template.sql?raw";
import logSql from "@hodor/core/db/sql/base_biz_log.sql?raw";

export function runMailActionIntegrationTests({
  runtime,
  getEnv,
  beforeAllHook,
}: {
  runtime: "Workers" | "Node.js";
  getEnv: () => any;
  beforeAllHook?: () => Promise<void> | void;
}) {
  const testTables = ["mail_account", "mail_template", "mail_log"];

  beforeAll(async () => {
    if (beforeAllHook) {
      await beforeAllHook();
    }
    await setupTestDb(db, [accountSql, templateSql, logSql]);
  });

  afterEach(async () => {
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
        scope: "biz",
        isEnabled: true,
        creatorId: 1,
      });

      // 2. 插入 Mock 邮件模板
      const templateId = await mailTemplateRepository.onInsert({
        name: "mock_template",
        title: "Hello {{name}}",
        langCode: "zh-CN",
        content: "Welcome, your code is {{code}}",
        scope: "biz",
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
      expect(sendRes.accepted.map((r) => r.address)).toEqual([
        "mock-receiver@example.com",
      ]);
      expect(sendRes.logId).toBeGreaterThan(0);

      // 5. 验证数据库中的邮件日志
      const log = await registry.base.log.biz.detail(sendRes.logId);
      expect(log).not.toBeNull();
      expect(log!.status).toBe(1);
      const logValue = log!.logValue as any;
      expect(logValue.mailFrom).toBe("mock-sender@example.com");
      expect(logValue.mailTo).toBe("mock-receiver@example.com");
      expect(logValue.title).toBe("Hello Antigravity");
      expect(logValue.templateId).toBe(String(templateId));
    });

    it("Mock 模式下验证邮箱连接，应该返回 true", async () => {
      const accountId = await mailAccountRepository.onInsert({
        mailAddress: "mock-verify@example.com",
        password: "base64password",
        nickname: "Verify Nick",
        host: "smtp.example.com",
        port: 587,
        scope: "biz",
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
  describe("真实发送模式全链路测试", () => {
    const environment = getEnv();

    // 动态判断是否跳过真实测试
    const shouldRun = !!environment.TEST_MAIL_ADDRESS;

    it.runIf(shouldRun)("应该成功发送真实邮件并录入日志", async () => {
      const realAddress = environment.TEST_MAIL_ADDRESS as string;
      const realPassword = environment.TEST_MAIL_PASSWORD as string;
      const realHost = environment.TEST_MAIL_HOST as string;
      const realPort = Number(environment.TEST_MAIL_PORT || 465);
      const receiver = environment.TEST_MAIL_RECEIVER as string;

      const accountId = await mailAccountRepository.onInsert({
        mailAddress: realAddress,
        password: realPassword,
        nickname: "Real Sender Test",
        host: realHost,
        port: realPort,
        scope: "biz",
        isEnabled: true,
        creatorId: 1,
      });

      // 2. 发送真实邮件
      const sendRes = await mailActionService.send.service(
        {
          accountId: accountId!,
          receiverArr: [{ name: "Tester", address: receiver }],
          subject: `OkFred Integrations Test Mail (${runtime})`,
          html: `<h3>Hello! This is a test mail from OkFred ${runtime} Integration.</h3>`,
        },
        { userId: 1 } as any
      );

      expect(sendRes.accepted.length).toBeGreaterThan(0);
      expect(sendRes.logId).toBeGreaterThan(0);

      // 3. 验证日志
      const log = await registry.base.log.biz.detail(sendRes.logId);
      expect(log).not.toBeNull();
      expect(log!.status).toBe(1);
      const logValue = log!.logValue as any;
      expect(logValue.mailFrom).toBe(realAddress);
    });

    it.runIf(shouldRun)(
      "真实模式下验证邮箱连接，正确的凭证应该返回 true",
      async () => {
        const realAddress = environment.TEST_MAIL_ADDRESS as string;
        const realPassword = environment.TEST_MAIL_PASSWORD as string;
        const realHost = environment.TEST_MAIL_HOST as string;
        const realPort = Number(environment.TEST_MAIL_PORT || 465);

        const accountId = await mailAccountRepository.onInsert({
          mailAddress: realAddress,
          password: realPassword,
          nickname: "Real Sender Test",
          host: realHost,
          port: realPort,
          scope: "biz",
          isEnabled: true,
          creatorId: 1,
        });

        const res = await mailActionService.verify.service({
          accountId: accountId!,
        });
        expect(res).toBe(true);
      }
    );

    it.runIf(shouldRun)(
      "真实模式下验证邮箱连接，错误的密码应该抛出错误",
      async () => {
        const realAddress = environment.TEST_MAIL_ADDRESS as string;
        const wrongPassword = (environment.TEST_MAIL_WRONG_PASSWORD ||
          "wrong_pass") as string;
        const realHost = environment.TEST_MAIL_HOST as string;
        const realPort = Number(environment.TEST_MAIL_PORT || 465);

        const accountId = await mailAccountRepository.onInsert({
          mailAddress: realAddress,
          password: wrongPassword,
          nickname: "Real Sender Test",
          host: realHost,
          port: realPort,
          scope: "biz",
          isEnabled: true,
          creatorId: 1,
        });

        await expect(
          mailActionService.verify.service({ accountId: accountId! })
        ).rejects.toThrow();
      }
    );
  });
}
