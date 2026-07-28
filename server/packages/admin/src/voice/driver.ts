import { type IDomainConfigProvider } from "../base/sys_config/model.js";
import { type JSONSchema } from "json-schema-to-ts";
import * as baseSysConfigRepository from "../base/sys_config/repository.js";
import { VoiceConfigOptionsSchema, type VoiceConfigOptions } from "./model.js";

/**
 * 实时音视频 (RealtimeKit) 配置提供者类
 */
export class VoiceConfigProvider implements IDomainConfigProvider {
  /**
   * 获取配置命名空间
   *
   * @returns 命名空间标识 'voice'
   */
  getNamespace(): string {
    return "voice";
  }

  /**
   * 获取 JSON Schema 配置约束
   *
   * @returns 字段级别的 JSON Schema 定义表
   */
  getJsonSchema(): Record<string, JSONSchema> {
    return VoiceConfigOptionsSchema.properties as Record<string, JSONSchema>;
  }

  /**
   * 获取默认配置初始值
   *
   * @returns 包含默认字段初始值的对象
   */
  getDefaultValues(): Record<string, unknown> {
    return {
      cfAccountId: "",
      rtkAppId: "",
      rtkApiToken: "",
    };
  }

  /**
   * 查询数据库中当前激活的 RealtimeKit 服务配置
   *
   * @returns 当前生效的 VoiceConfigOptions 配置对象或 undefined
   */
  async getActiveConfig(): Promise<VoiceConfigOptions | undefined> {
    const configList = await baseSysConfigRepository.findByNamespace("voice");
    const activeCfg =
      configList.find((cfg) => cfg.isEnabled && cfg.isPrimary) ||
      configList.find((cfg) => cfg.isEnabled);
    let configObj = {} as VoiceConfigOptions;
    try {
      configObj = JSON.parse(activeCfg?.configValue as string);
    } catch {}
    return configObj;
  }
}

/** 实时音视频配置提供者单例 */
export const voiceConfigProvider = new VoiceConfigProvider();
