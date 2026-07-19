import { type IDomainConfigProvider } from "../../base/config/model";
import { type JSONSchema } from "json-schema-to-ts";
import { AiLlmConfigAddVO } from "./model";

export class AiConfigProvider implements IDomainConfigProvider {
  getNamespace(): string {
    return "ai";
  }

  getJsonSchema(): Record<string, JSONSchema> {
    return {
      provider: AiLlmConfigAddVO.provider,
      baseUrl: AiLlmConfigAddVO.baseUrl,
      apiKey: AiLlmConfigAddVO.apiKey,
      model: AiLlmConfigAddVO.model,
      capabilities: AiLlmConfigAddVO.capabilities,
    };
  }

  getDefaultValues() {
    return {
      name: "",
      provider: "OpenAI",
      baseUrl: "",
      apiKey: "",
      model: "gpt-4o",
      capabilities: null,
      isEnabled: true,
      isDefault: false,
    };
  }
}
