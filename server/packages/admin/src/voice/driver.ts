import { type IDomainConfigProvider } from "../base/sys_config/model.js";
import { type JSONSchema } from "json-schema-to-ts";
import * as baseSysConfigRepository from "../base/sys_config/repository.js";
import { VoiceConfigOptionsSchema, type VoiceConfigOptions } from "./model.js";

export class VoiceConfigProvider implements IDomainConfigProvider {
  getNamespace(): string {
    return "voice";
  }

  getJsonSchema(): Record<string, JSONSchema> {
    return VoiceConfigOptionsSchema.properties as Record<string, JSONSchema>;
  }

  getDefaultValues(): Record<string, unknown> {
    return {
      cfAccountId: "",
      rtkAppId: "",
      rtkApiToken: "",
    };
  }

  async getActiveConfig(): Promise<VoiceConfigOptions | undefined> {
    const configList = await baseSysConfigRepository.findByNamespace("voice");
    const activeCfg =
      configList.find((cfg) => cfg.isEnabled && cfg.isPrimary) ||
      configList.find((cfg) => cfg.isEnabled);
    let configObj = {} as VoiceConfigOptions;
    try {
      configObj = JSON.parse(activeCfg?.configValue as string);
    } catch (err) {}
    return configObj;
  }
}

export const voiceConfigProvider = new VoiceConfigProvider();
