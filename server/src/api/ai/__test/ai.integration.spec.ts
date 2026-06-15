import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import aiLlmConfigService from "../config/service";
import aiChatService from "../chat/service";
import aiConfigSql from "@/db/sql/ai_llm_config.sql?raw";
import { BusinessError } from "@/middleware/errorHandler/businessError";
import { ErrorCodes as ChatErrorCodes } from "../chat/prevention";
import type { UserObj } from "@/types/app";

describe("AI 模块全链路集成测试", () => {
  const testTables = ["ai_llm_config"];
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    await setupTestDb(db, [aiConfigSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
    vi.unstubAllGlobals();
  });

  describe("AI 配置管理 (CRUD)", () => {
    it("全流程增删改查测试", async () => {
      // 1. Add
      const configId = await aiLlmConfigService.add.service(
        {
          name: "DeepSeek Chat",
          provider: "DeepSeek",
          baseUrl: "https://api.deepseek.com/v1",
          apiKey: "sk-test-key-123",
          model: "deepseek-chat",
          capabilities: JSON.stringify(["text"]),
          isEnabled: true,
          isDefault: false,
          remark: "Test DeepSeek Config",
        },
        userObj
      );
      expect(configId).toBeGreaterThan(0);

      // 2. Get
      const config = await aiLlmConfigService.get.service({ id: configId! });
      expect(config.name).toBe("DeepSeek Chat");
      expect(config.provider).toBe("DeepSeek");
      expect(config.baseUrl).toBe("https://api.deepseek.com/v1");
      expect(config.apiKey).toBe("sk-test-key-123");
      expect(config.model).toBe("deepseek-chat");
      expect(config.capabilities).toBe(JSON.stringify(["text"]));
      expect(config.isEnabled).toBe(true);
      expect(config.isDefault).toBe(false);

      // 3. Update
      const updatedId = await aiLlmConfigService.update.service(
        {
          id: configId!,
          name: "DeepSeek V3",
          isEnabled: false,
          remark: "Updated Remark",
        },
        userObj
      );
      expect(updatedId).toBe(configId);

      const configAfterUpdate = await aiLlmConfigService.get.service({
        id: configId!,
      });
      expect(configAfterUpdate.name).toBe("DeepSeek V3");
      expect(configAfterUpdate.isEnabled).toBe(false);
      expect(configAfterUpdate.remark).toBe("Updated Remark");

      // 4. Delete
      const deletedId = await aiLlmConfigService.delete.service({
        id: configId!,
      });
      expect(deletedId).toBe(configId);

      await expect(
        aiLlmConfigService.get.service({ id: configId! })
      ).rejects.toThrow();
    });

    it("列表查询测试 (list & listAll)", async () => {
      await aiLlmConfigService.add.service(
        {
          name: "LLM Config 1",
          provider: "OpenAI",
          apiKey: "key-1",
          model: "gpt-4",
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );
      await aiLlmConfigService.add.service(
        {
          name: "LLM Config 2",
          provider: "Ollama",
          apiKey: "key-2",
          model: "llama3",
          isEnabled: false,
          isDefault: false,
        },
        userObj
      );

      // listAll (不分页)
      const allList = await aiLlmConfigService.listAll.service({
        isEnabled: true,
      });
      expect(allList.length).toBe(1);
      expect(allList[0].name).toBe("LLM Config 1");

      // list (分页)
      const pageResult = await aiLlmConfigService.list.service({
        pageNo: 1,
        pageSize: 10,
      });
      expect(pageResult.total).toBe(2);
      expect(pageResult.list.length).toBe(2);
    });

    it("默认配置排他性设置测试 (isDefault)", async () => {
      // 1. 添加第一个配置为默认
      const id1 = await aiLlmConfigService.add.service(
        {
          name: "Config 1",
          provider: "Provider 1",
          apiKey: "key-1",
          model: "model-1",
          isEnabled: true,
          isDefault: true,
        },
        userObj
      );

      // 验证第一个是默认
      let c1 = await aiLlmConfigService.get.service({ id: id1! });
      expect(c1.isDefault).toBe(true);

      // 2. 添加第二个配置，也设为默认
      const id2 = await aiLlmConfigService.add.service(
        {
          name: "Config 2",
          provider: "Provider 2",
          apiKey: "key-2",
          model: "model-2",
          isEnabled: true,
          isDefault: true,
        },
        userObj
      );

      // 验证排他性：第二个成为默认，第一个被自动取消默认
      c1 = await aiLlmConfigService.get.service({ id: id1! });
      let c2 = await aiLlmConfigService.get.service({ id: id2! });
      expect(c1.isDefault).toBe(false);
      expect(c2.isDefault).toBe(true);

      // 3. 添加第三个配置，非默认
      const id3 = await aiLlmConfigService.add.service(
        {
          name: "Config 3",
          provider: "Provider 3",
          apiKey: "key-3",
          model: "model-3",
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );

      // 验证排他性未触发：第二个依然是默认
      c2 = await aiLlmConfigService.get.service({ id: id2! });
      let c3 = await aiLlmConfigService.get.service({ id: id3! });
      expect(c2.isDefault).toBe(true);
      expect(c3.isDefault).toBe(false);

      // 4. 更新第三个为默认
      await aiLlmConfigService.update.service(
        {
          id: id3!,
          isDefault: true,
        },
        userObj
      );

      // 验证排他性：第三个成为默认，第二个被自动取消默认
      c2 = await aiLlmConfigService.get.service({ id: id2! });
      c3 = await aiLlmConfigService.get.service({ id: id3! });
      expect(c2.isDefault).toBe(false);
      expect(c3.isDefault).toBe(true);
    });
  });

  describe("AI 配置连通性校验 (Verify Connection)", () => {
    it("连通验证成功情况", async () => {
      const configId = await aiLlmConfigService.add.service(
        {
          name: "Test Connection",
          provider: "MockProvider",
          baseUrl: "https://api.mock.com",
          apiKey: "mock-key",
          model: "mock-model",
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );

      // Mock fetch to return success
      const mockFetch = vi.fn().mockImplementation(async (url, init) => {
        expect(url).toBe("https://api.mock.com/models");
        expect(init?.headers?.Authorization).toBe("Bearer mock-key");
        return {
          ok: true,
          json: async () => ({
            object: "list",
            data: [
              {
                id: "mock-model",
                object: "model",
                created: 1,
                owned_by: "mock",
              },
            ],
          }),
        } as Response;
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await aiLlmConfigService.verify.service({ id: configId! });
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("连通验证失败情况", async () => {
      const configId = await aiLlmConfigService.add.service(
        {
          name: "Test Connection Fail",
          provider: "MockProvider",
          baseUrl: "https://api.mock.com",
          apiKey: "mock-key",
          model: "mock-model",
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );

      // Mock fetch to fail (throw error or empty list)
      const mockFetch = vi.fn().mockImplementation(async () => {
        return {
          ok: false,
          json: async () => ({
            error: "Unauthorized",
          }),
        } as Response;
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await aiLlmConfigService.verify.service({ id: configId! });
      expect(result).toBe(false);
    });
  });

  describe("AI 智能对话 (Chat Ask)", () => {
    it("对话请求发送与响应解析测试", async () => {
      // 1. 添加默认配置
      await aiLlmConfigService.add.service(
        {
          name: "Default LLM",
          provider: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-openai-key",
          model: "gpt-4o",
          isEnabled: true,
          isDefault: true,
        },
        userObj
      );

      // 2. Mock fetch for chat completion
      const mockFetch = vi.fn().mockImplementation(async (url, init) => {
        expect(url).toBe("https://api.openai.com/v1/chat/completions");
        expect(init?.method).toBe("POST");
        expect(init?.headers?.["Content-Type"]).toBe("application/json");
        expect(init?.headers?.Authorization).toBe("Bearer sk-openai-key");

        const body = JSON.parse(init.body);
        expect(body.model).toBe("gpt-4o");
        expect(body.messages.length).toBe(3); // history(1) + system(1) + user(1)
        expect(body.messages[0]).toEqual({
          role: "user",
          content: "Previous question",
        });
        expect(body.messages[1].role).toBe("system");
        expect(body.messages[2]).toEqual({
          role: "user",
          content: "Hello AI!",
        });

        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: "Hello Human! How can I help you today?",
                },
              },
            ],
          }),
        } as Response;
      });
      vi.stubGlobal("fetch", mockFetch);

      // 3. 调用 ask 服务
      const answer = await aiChatService.ask.service({
        q: "Hello AI!",
        history: [{ role: "user", content: "Previous question" }],
      });

      expect(answer).toBe("Hello Human! How can I help you today?");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("空提示词校验测试", async () => {
      await expect(aiChatService.ask.service({ q: "" })).rejects.toThrowError(
        new BusinessError(ChatErrorCodes.PROMPT_REQUIRED)
      );

      await expect(
        aiChatService.ask.service({ q: "   " })
      ).rejects.toThrowError(new BusinessError(ChatErrorCodes.PROMPT_REQUIRED));
    });

    it("未设置默认配置报错测试", async () => {
      // 确认当前没有默认配置存在（清空了或者设置 isDefault 为 false）
      // 在 afterEach 中已经 clearTestData，所以这里没有配置
      await expect(
        aiChatService.ask.service({ q: "Hello" })
      ).rejects.toThrowError(
        new BusinessError(ChatErrorCodes.CONFIG_NOT_FOUND)
      );
    });

    it("API 响应失败报错测试", async () => {
      // 1. 添加默认配置
      await aiLlmConfigService.add.service(
        {
          name: "Default LLM",
          provider: "OpenAI",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-openai-key",
          model: "gpt-4o",
          isEnabled: true,
          isDefault: true,
        },
        userObj
      );

      // 2. Mock fetch returning 500 error
      const mockFetch = vi.fn().mockImplementation(async () => {
        return {
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        } as Response;
      });
      vi.stubGlobal("fetch", mockFetch);

      // 3. 调用并断言抛出错误
      await expect(
        aiChatService.ask.service({ q: "Hello" })
      ).rejects.toThrowError("AI API 响应错误 (500)");
    });
  });
});
