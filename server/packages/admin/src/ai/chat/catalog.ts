import type { FromSchema } from "json-schema-to-ts";
import { getAllEnv, getEnv } from "@hodor/core/utils/env";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import type { ModelsRes } from "./model";
import { listEnabledChatConfigurations } from "./repository";
import { ErrorCodes } from "./prevention";

export const CF_TEXT_MODEL = "@cf/meta/llama-3.2-3b-instruct";
export const CF_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
type ChatCapability = "text" | "image";
type Catalog = FromSchema<typeof ModelsRes>;
type ModelItem = Catalog["models"][number];
type ChatBinding = Pick<Env["AI"], "run">;

interface DescriptorBase {
  item: ModelItem;
  primary: boolean;
}

export type ChatDescriptor = DescriptorBase &
  (
    | {
        kind: "cloudflare_binding";
        model: typeof CF_TEXT_MODEL | typeof CF_VISION_MODEL;
        binding: ChatBinding;
      }
    | {
        kind: "cloudflare_rest";
        model: typeof CF_TEXT_MODEL | typeof CF_VISION_MODEL;
        accountId: string;
        apiKey: string;
      }
    | {
        kind: "openai_compatible";
        model: string;
        baseUrl: string;
        apiKey: string;
      }
    | { kind: "unavailable" }
  );

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isChatBinding(value: unknown): value is ChatBinding {
  return isRecord(value) && typeof value.run === "function";
}

function readCapabilities(value: unknown): ChatCapability[] | null {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (parsed === null || parsed === undefined) return ["text"];
  if (
    !Array.isArray(parsed) ||
    !parsed.includes("text") ||
    parsed.includes("embedding")
  )
    return null;
  return parsed.includes("image") ? ["text", "image"] : ["text"];
}

function isCompatibleProvider(provider: unknown): boolean {
  return (
    typeof provider === "string" &&
    [
      "openai",
      "deepseek",
      "ollama",
      "siliconflow",
      "openai-compatible",
    ].includes(provider.trim().toLowerCase())
  );
}

function validBaseUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function fingerprint(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value))
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function loadChatCatalog(): Promise<{
  catalog: Catalog;
  descriptors: ChatDescriptor[];
}> {
  const bindingValue: unknown = getAllEnv().AI;
  const binding = isChatBinding(bindingValue) ? bindingValue : undefined;
  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID")?.trim();
  const apiKey = getEnv("CLOUDFLARE_API_TOKEN")?.trim();
  const restAvailable = Boolean(accountId && apiKey);
  const transport = binding ? "binding" : "rest";
  const descriptors: ChatDescriptor[] = [];
  for (const [variant, model, capabilities] of [
    ["text", CF_TEXT_MODEL, ["text"]],
    ["vision", CF_VISION_MODEL, ["text", "image"]],
  ] as const) {
    const item: ModelItem = {
      modelKey: `cf:${transport}:${variant}`,
      label:
        variant === "text"
          ? "Cloudflare Llama 3.2 3B"
          : "Cloudflare Llama 3.2 11B Vision",
      providerKind: "cloudflare",
      capabilities: [...capabilities],
      available: Boolean(binding || restAvailable),
      unavailableReason:
        binding || restAvailable ? null : ErrorCodes.CONFIG_NOT_FOUND,
      isDefault: false,
    };
    if (binding) {
      descriptors.push({
        kind: "cloudflare_binding",
        item,
        primary: false,
        binding,
        model,
      });
    } else if (accountId && apiKey) {
      descriptors.push({
        kind: "cloudflare_rest",
        item,
        primary: false,
        accountId,
        apiKey,
        model,
      });
    } else {
      descriptors.push({ kind: "unavailable", item, primary: false });
    }
  }

  const rows = await listEnabledChatConfigurations();
  for (const row of rows) {
    if (!row.isEnabled || !isRecord(row.configValue)) continue;
    const config = row.configValue;
    if (!isCompatibleProvider(config.provider)) continue;
    const capabilities = readCapabilities(config.capabilities);
    if (
      !capabilities ||
      typeof config.model !== "string" ||
      !config.model.trim() ||
      /embed|(?:^|\/)bge-|(?:^|\/)e5-|nomic-embed/i.test(config.model)
    )
      continue;
    const baseUrl = validBaseUrl(config.baseUrl);
    const configApiKey =
      typeof config.apiKey === "string" ? config.apiKey.trim() : "";
    // Never hash credentials into a public key. Key rotations use updateTimeUtc.
    const revision = await fingerprint({
      id: row.id,
      updated: row.updateTimeUtc ?? row.createTimeUtc,
      provider: config.provider,
      baseUrl,
      model: config.model,
      capabilities,
    });
    const available = Boolean(baseUrl && configApiKey);
    const item: ModelItem = {
      modelKey: `config:${row.id}:${revision}`,
      label: row.configKey,
      providerKind: "openai_compatible",
      capabilities,
      available,
      unavailableReason: available ? null : ErrorCodes.MODEL_UNAVAILABLE,
      isDefault: false,
    };
    if (baseUrl && configApiKey) {
      descriptors.push({
        kind: "openai_compatible",
        item,
        primary: row.isPrimary,
        model: config.model,
        baseUrl,
        apiKey: configApiKey,
      });
    } else {
      descriptors.push({ kind: "unavailable", item, primary: row.isPrimary });
    }
  }
  const selected = binding
    ? descriptors[0]
    : (descriptors.find(
        (descriptor) => descriptor.primary && descriptor.item.available
      ) ?? (restAvailable ? descriptors[0] : undefined));
  if (selected) selected.item.isDefault = true;
  return {
    catalog: {
      defaultModelKey: selected?.item.modelKey ?? null,
      models: descriptors.map((descriptor) => descriptor.item),
    },
    descriptors,
  };
}

export function selectChatDescriptor(
  descriptors: ChatDescriptor[],
  defaultModelKey: string | null,
  modelKey?: string
): ChatDescriptor {
  const selectedKey = modelKey ?? defaultModelKey;
  if (!selectedKey) throw new BusinessError(ErrorCodes.CONFIG_NOT_FOUND);
  const descriptor = descriptors.find(
    (item) => item.item.modelKey === selectedKey
  );
  if (!descriptor) throw new BusinessError(ErrorCodes.MODEL_CHANGED);
  if (!descriptor.item.available || descriptor.kind === "unavailable") {
    throw new BusinessError(ErrorCodes.MODEL_UNAVAILABLE);
  }
  return descriptor;
}
