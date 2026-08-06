import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import aiChatService from "./service";
import { getDefaultConfig } from "../config/service";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { ErrorCodes } from "./prevention";
import { initAdminRegistry } from "../../register";

vi.mock("../config/service", () => {
  return {
    getDefaultConfig: vi.fn(),
  };
});

describe("AI Chat Service 单元测试", () => {
  beforeAll(() => {
    initAdminRegistry();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("onAsk", () => {
    it("应该正确调用 fetch 并返回 AI 答复", async () => {
      vi.mocked(getDefaultConfig).mockResolvedValue({
        id: 1,
        name: "Test",
        provider: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-key",
        model: "gpt-4",
        isEnabled: true,
        isDefault: true,
        creatorId: 1,
        createTimeUtc: 1234567,
      } as Awaited<ReturnType<typeof getDefaultConfig>>);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Hello from mock AI",
              },
            },
          ],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const params = { q: "Hello AI", history: [] };
      const res = await aiChatService.ask.service(params);

      expect(getDefaultConfig).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.method).toBe("POST");
      const auth =
        typeof init?.headers?.get === "function"
          ? init.headers.get("Authorization")
          : init?.headers?.Authorization;
      expect(auth).toBe("Bearer sk-key");
      expect(res).toBe("Hello from mock AI");
    });

    it("空提示词时应该抛出异常", async () => {
      await expect(aiChatService.ask.service({ q: "" })).rejects.toThrowError(
        new BusinessError(ErrorCodes.PROMPT_REQUIRED)
      );
    });

    it("找不到默认配置时应该抛出异常", async () => {
      vi.mocked(getDefaultConfig).mockResolvedValue(null);

      await expect(
        aiChatService.ask.service({ q: "Hello" })
      ).rejects.toThrowError(BusinessError);
    });

    it("API 请求返回错误时应该抛出异常", async () => {
      vi.mocked(getDefaultConfig).mockResolvedValue({
        id: 1,
        name: "Test",
        provider: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-key",
        model: "gpt-4",
        isEnabled: true,
        isDefault: true,
        creatorId: 1,
        createTimeUtc: 1234567,
      } as Awaited<ReturnType<typeof getDefaultConfig>>);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        aiChatService.ask.service({ q: "Hello" })
      ).rejects.toThrowError(/401/);
    });
  });
});
