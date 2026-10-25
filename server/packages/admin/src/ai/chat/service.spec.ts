import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SafeFetchOptions } from "@hodor/core/utils/safeFetch";
import type { registry } from "../../common/registry";
import chatService from "./service";
import { getDefaultConfig } from "../config/service";
import { ErrorCodes } from "./prevention";
import { CF_TEXT_MODEL, CF_VISION_MODEL } from "./catalog";

type List = typeof registry.base.sysConfig.list;
type Page = Awaited<ReturnType<List>>;
type Row = Page["list"][number];
type HttpFetch = (
  url: string | URL,
  options?: SafeFetchOptions
) => Promise<Response>;

const mocks = vi.hoisted(() => {
  const environment: Record<string, unknown> = {};
  return { environment, list: vi.fn<List>(), fetch: vi.fn<HttpFetch>() };
});

vi.mock("../../common/registry", () => ({
  registry: {
    base: {
      sysConfig: { list: mocks.list },
      httpFetch: { fetch: mocks.fetch },
    },
  },
}));
vi.mock("@hodor/core/utils/env", () => ({
  getAllEnv: () => mocks.environment,
  getEnv: (key: string) => mocks.environment[key],
}));

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
const JPEG = `data:image/jpeg;base64,${btoa(String.fromCharCode(255, 216, 255, 224, 0, 16, 255, 217))}`;

function row(
  overrides: Partial<Row> = {},
  config: Record<string, unknown> = {}
): Row {
  return {
    id: 1,
    namespace: "ai",
    configKey: "Configured model",
    isEnabled: true,
    isPrimary: true,
    configValue: {
      provider: "OpenAI",
      baseUrl: "https://provider.example/v1",
      apiKey: "private-key-sentinel",
      model: "gpt-4o",
      capabilities: null,
      ...config,
    },
    remark: null,
    creatorId: 1,
    updaterId: null,
    createTimeUtc: 1000,
    updateTimeUtc: null,
    ...overrides,
  };
}

function page(rows: Row[], total = rows.length, currentPage = 1): Page {
  return {
    list: rows,
    total,
    totalPage: Math.ceil(total / 1000),
    currentPage,
    pageSize: 1000,
  };
}

function setRows(rows: Row[]): void {
  mocks.list.mockResolvedValue(page(rows));
}

async function configuredKey(): Promise<string> {
  const catalog = await chatService.models.service({});
  const model = catalog.models.find(
    (item) => item.providerKind === "openai_compatible"
  );
  expect(model).toBeDefined();
  if (!model) throw new Error("Missing fixture configuration");
  return model.modelKey;
}

describe("strict AI chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mocks.environment))
      delete mocks.environment[key];
    setRows([]);
    mocks.fetch.mockResolvedValue(
      Response.json({ choices: [{ message: { content: "Model answer" } }] })
    );
  });

  it("publishes the exact safe catalog and keeps both endpoints on read permission", async () => {
    setRows([row()]);
    const catalog = await chatService.models.service({});
    expect(Object.keys(catalog).sort()).toEqual(["defaultModelKey", "models"]);
    expect(catalog.models).toHaveLength(3);
    for (const model of catalog.models) {
      expect(Object.keys(model).sort()).toEqual([
        "available",
        "capabilities",
        "isDefault",
        "label",
        "modelKey",
        "providerKind",
        "unavailableReason",
      ]);
    }
    expect(catalog.defaultModelKey).toMatch(/^config:1:/);
    expect(catalog.models.filter((item) => item.isDefault)).toHaveLength(1);
    expect(JSON.stringify(catalog)).not.toContain("private-key-sentinel");
    expect(JSON.stringify(catalog)).not.toContain("provider.example");
    expect(chatService.models.permission).toEqual({ action: "read" });
    expect(chatService.ask.permission).toEqual({ action: "read" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("prefers the existing binding, then a primary supported config, then CF REST", async () => {
    const run = vi.fn().mockResolvedValue({ response: "Binding answer" });
    setRows([row()]);
    mocks.environment.AI = { run };
    mocks.environment.CLOUDFLARE_ACCOUNT_ID = "account";
    mocks.environment.CLOUDFLARE_API_TOKEN = "cf-token";
    expect((await chatService.models.service({})).defaultModelKey).toBe(
      "cf:binding:text"
    );
    expect(await chatService.ask.service({ q: "Hello" })).toBe(
      "Binding answer"
    );
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toBe(CF_TEXT_MODEL);
    expect(mocks.fetch).not.toHaveBeenCalled();
    delete mocks.environment.AI;
    expect((await chatService.models.service({})).defaultModelKey).toMatch(
      /^config:1:/
    );
    setRows([row({ isPrimary: false })]);
    expect((await chatService.models.service({})).defaultModelKey).toBe(
      "cf:rest:text"
    );
  });

  it("does not make a nonprimary configuration the implicit default", async () => {
    setRows([row({ isPrimary: false })]);
    expect((await chatService.models.service({})).defaultModelKey).toBeNull();
    await expect(chatService.ask.service({ q: "Hello" })).rejects.toThrow(
      ErrorCodes.CONFIG_NOT_FOUND
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("filters disabled, embedding and native Anthropic configurations", async () => {
    setRows([
      row({ id: 1, isEnabled: false }),
      row({ id: 2 }, { provider: "Anthropic", model: "claude-3" }),
      row({ id: 3 }, { model: "text-embedding-3-small" }),
      row({ id: 4 }, { capabilities: '["embedding"]' }),
      row({ id: 5 }, { provider: "Other" }),
      row({ id: 6 }, { capabilities: "bad-json" }),
      row({ id: 8 }, { capabilities: '["text","embedding"]' }),
      row({ id: 7 }, { provider: "DeepSeek" }),
    ]);
    const catalog = await chatService.models.service({});
    expect(
      catalog.models
        .filter((model) => model.providerKind === "openai_compatible")
        .map((model) => model.modelKey)
    ).toEqual([expect.stringMatching(/^config:7:/)]);
  });

  it("marks incomplete configurations unavailable and rejects them before inference", async () => {
    setRows([
      row({}, { baseUrl: "https://user:password@provider.example/v1" }),
    ]);
    const key = await configuredKey();
    const catalog = await chatService.models.service({});
    expect(catalog.defaultModelKey).toBeNull();
    expect(
      catalog.models.find((model) => model.modelKey === key)?.available
    ).toBe(false);
    await expect(
      chatService.ask.service({ q: "Hello", modelKey: key })
    ).rejects.toThrow(ErrorCodes.MODEL_UNAVAILABLE);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("executes the explicit system model even while the binding is the default", async () => {
    const run = vi.fn();
    mocks.environment.AI = { run };
    setRows([row({}, { model: "selected-model" })]);
    const key = await configuredKey();
    const answer = await chatService.ask.service({
      q: "Current",
      modelKey: key,
      history: [
        { role: "user", content: "Previous" },
        { role: "assistant", content: "Earlier answer" },
      ],
    });
    expect(answer).toBe("Model answer");
    expect(run).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toBe("https://provider.example/v1/chat/completions");
    expect(options).toMatchObject({
      method: "POST",
      auditMode: "metadata-only",
      redirect: "error",
    });
    expect(JSON.parse(String(options?.body))).toMatchObject({
      model: "selected-model",
      messages: [
        expect.objectContaining({ role: "system" }),
        { role: "user", content: "Previous" },
        { role: "assistant", content: "Earlier answer" },
        { role: "user", content: "Current" },
      ],
    });
  });

  it.each([
    { model: "changed-model" },
    { baseUrl: "https://changed.example/v1" },
    { capabilities: '["text","image"]' },
  ])(
    "rejects stale descriptor after a semantic config change: %j",
    async (change) => {
      setRows([row()]);
      const key = await configuredKey();
      setRows([row({}, change)]);
      await expect(
        chatService.ask.service({ q: "Hello", modelKey: key })
      ).rejects.toThrow(ErrorCodes.MODEL_CHANGED);
      expect(mocks.fetch).not.toHaveBeenCalled();
    }
  );

  it("uses update revision for credential rotations without hashing credentials", async () => {
    setRows([row()]);
    const key = await configuredKey();
    setRows([row({}, { apiKey: "rotated-secret" })]);
    expect(await configuredKey()).toBe(key);
    setRows([row({ updateTimeUtc: 2000 }, { apiKey: "rotated-secret" })]);
    expect(await configuredKey()).not.toBe(key);
    await expect(
      chatService.ask.service({ q: "Hello", modelKey: key })
    ).rejects.toThrow(ErrorCodes.MODEL_CHANGED);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects a removed model and arbitrary caller-selected provider/model keys", async () => {
    await expect(
      chatService.ask.service({
        q: "Hello",
        modelKey: "https://attacker.example/model",
      })
    ).rejects.toThrow(ErrorCodes.MODEL_CHANGED);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([PNG, JPEG])(
    "sends a validated current image through the explicit vision binding",
    async (image) => {
      const run = vi.fn().mockResolvedValue({ response: "Vision answer" });
      mocks.environment.AI = { run };
      expect(
        await chatService.ask.service({
          q: "Describe",
          image,
          modelKey: "cf:binding:vision",
        })
      ).toBe("Vision answer");
      expect(run).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenCalledWith(
        CF_VISION_MODEL,
        expect.objectContaining({
          messages: [
            expect.objectContaining({ role: "system" }),
            {
              role: "user",
              content: [
                { type: "text", text: "Describe" },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
        })
      );
      expect(mocks.fetch).not.toHaveBeenCalled();
      expect(JSON.stringify(run.mock.calls[0])).not.toContain('"agree"');
    }
  );

  it("preserves a historical image and rejects it on a text-only model", async () => {
    setRows([row({}, { capabilities: '["text","image"]' })]);
    const history = [
      {
        role: "user",
        content: [
          { type: "text", text: "Earlier" },
          { type: "image_url", image_url: { url: PNG } },
        ],
      },
    ] satisfies NonNullable<
      Parameters<typeof chatService.ask.service>[0]["history"]
    >;
    expect(await chatService.ask.service({ q: "Continue", history })).toBe(
      "Model answer"
    );
    expect(
      JSON.parse(String(mocks.fetch.mock.calls[0][1]?.body))
    ).toMatchObject({
      messages: [
        expect.objectContaining({ role: "system" }),
        ...history,
        { role: "user", content: "Continue" },
      ],
    });
    setRows([row()]);
    await expect(
      chatService.ask.service({ q: "Continue", history })
    ).rejects.toThrow(ErrorCodes.IMAGE_UNSUPPORTED);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    "https://private.example/image.png",
    "data:image/gif;base64,R0lGODlh",
    "data:image/jpeg;base64,iVBORw0KGgo=",
    "data:image/png;base64,aGVsbG8=",
    "data:image/png;base64,@@@@",
    "data:image/png;base64,iVBORw0KGgo",
    "",
  ])(
    "rejects invalid or remote current/history image before inference: %s",
    async (image) => {
      await expect(
        chatService.ask.service({ q: "Describe", image })
      ).rejects.toThrow(ErrorCodes.IMAGE_INVALID);
      await expect(
        chatService.ask.service({
          q: "Describe",
          history: [
            {
              role: "user",
              content: [{ type: "image_url", image_url: { url: image } }],
            },
          ],
        })
      ).rejects.toThrow(ErrorCodes.IMAGE_INVALID);
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.fetch).not.toHaveBeenCalled();
    }
  );

  it("rejects multiple images across current and history, including duplicate data", async () => {
    await expect(
      chatService.ask.service({
        q: "Describe",
        image: PNG,
        history: [
          {
            role: "user",
            content: [{ type: "image_url", image_url: { url: PNG } }],
          },
        ],
      })
    ).rejects.toThrow(ErrorCodes.IMAGE_LIMIT);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("accepts exactly 5 MiB and rejects a decoded image one byte larger", async () => {
    const run = vi.fn().mockResolvedValue({ response: "Large image" });
    mocks.environment.AI = { run };
    const jpegPrefix = String.fromCharCode(255, 216, 255);
    const exact = `data:image/jpeg;base64,${btoa(jpegPrefix + "a".repeat(5 * 1024 * 1024 - 3))}`;
    expect(
      await chatService.ask.service({
        q: "Describe",
        image: exact,
        modelKey: "cf:binding:vision",
      })
    ).toBe("Large image");
    const oversized = `data:image/jpeg;base64,${btoa(jpegPrefix + "a".repeat(5 * 1024 * 1024 - 2))}`;
    await expect(
      chatService.ask.service({
        q: "Describe",
        image: oversized,
        modelKey: "cf:binding:vision",
      })
    ).rejects.toThrow(ErrorCodes.IMAGE_TOO_LARGE);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("makes exactly one Cloudflare REST call and unwraps its result", async () => {
    mocks.environment.CLOUDFLARE_ACCOUNT_ID = "account";
    mocks.environment.CLOUDFLARE_API_TOKEN = "cf-token";
    mocks.fetch.mockResolvedValue(
      Response.json({ success: true, result: { response: "REST answer" } })
    );
    expect(await chatService.ask.service({ q: "Hello" })).toBe("REST answer");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls[0][0]).toBe(
      `https://api.cloudflare.com/client/v4/accounts/account/ai/run/${CF_TEXT_MODEL}`
    );
  });

  it("does not fall back after a binding exception and never exposes provider details", async () => {
    mocks.environment.AI = {
      run: vi
        .fn()
        .mockRejectedValue(new Error("private-key-sentinel prompt payload")),
    };
    mocks.environment.CLOUDFLARE_ACCOUNT_ID = "account";
    mocks.environment.CLOUDFLARE_API_TOKEN = "cf-token";
    setRows([row()]);
    await expect(chatService.ask.service({ q: "Hello" })).rejects.toMatchObject(
      { message: ErrorCodes.UPSTREAM_ERROR, meta: undefined }
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([401, 429, 500])(
    "returns one stable safe business error for upstream HTTP %i",
    async (status) => {
      setRows([row()]);
      mocks.fetch.mockResolvedValue(
        new Response("private-key-sentinel prompt payload", { status })
      );
      await expect(
        chatService.ask.service({ q: "Hello" })
      ).rejects.toMatchObject({
        message: ErrorCodes.UPSTREAM_ERROR,
        meta: undefined,
      });
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    { choices: [] },
    { choices: [{ message: { content: "" } }] },
    { unexpected: "private-payload" },
  ])(
    "rejects invalid provider results without serializing them",
    async (payload) => {
      setRows([row()]);
      mocks.fetch.mockResolvedValue(Response.json(payload));
      await expect(chatService.ask.service({ q: "Hello" })).rejects.toThrow(
        ErrorCodes.UPSTREAM_INVALID
      );
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    }
  );

  it("rejects HTTP 200 Cloudflare provider failure without fallback", async () => {
    mocks.environment.CLOUDFLARE_ACCOUNT_ID = "account";
    mocks.environment.CLOUDFLARE_API_TOKEN = "cf-token";
    mocks.fetch.mockResolvedValue(
      Response.json({ success: false, errors: [{ message: "secret details" }] })
    );
    await expect(chatService.ask.service({ q: "Hello" })).rejects.toThrow(
      ErrorCodes.UPSTREAM_ERROR
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("finds a primary default instead of truncating before filtering", async () => {
    setRows([row()]);
    expect((await getDefaultConfig())?.name).toBe("Configured model");
    expect(mocks.list).toHaveBeenCalledWith({
      namespace: "ai",
      isEnabled: true,
      orderBy: "isPrimary",
      descend: true,
      pageNo: 1,
      pageSize: 1,
    });
  });

  it("loads enabled configurations beyond the first management page", async () => {
    mocks.list.mockResolvedValueOnce(
      page([row({ id: 1, isPrimary: false })], 2)
    );
    mocks.list.mockResolvedValueOnce(page([row({ id: 2 })], 2, 2));
    const catalog = await chatService.models.service({});
    expect(catalog.models).toHaveLength(4);
    expect(catalog.defaultModelKey).toMatch(/^config:2:/);
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty prompt without loading model configuration", async () => {
    await expect(chatService.ask.service({ q: "   " })).rejects.toThrow(
      ErrorCodes.PROMPT_REQUIRED
    );
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
