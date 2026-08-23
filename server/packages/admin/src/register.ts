import { ServiceRegistry, setRegistry } from "./common/registry.js";
import { utils as userUtils } from "./system/user/service.js";
import { utils as rolePermissionUtils } from "./system/role_permission/service.js";
import { utils as roleUtils } from "./system/role/service.js";
import { utils as regionUtils } from "./i18n/region/service.js";
import { utils as languageUtils } from "./i18n/language/service.js";
import regionService from "./i18n/region/service.js";
import { utils as loginLogUtils } from "./maintenance/login_log/service.js";
import { exportDeletionRecord } from "./maintenance/compliance/index.js";
import { runPendingJobs } from "./maintenance/cron/scheduler.js";
import { dockerClient } from "./swarm/docker/client.js";
import { findDefaultActiveConfig } from "./rpa/config/service.js";
import { RpaConfigProvider } from "./rpa/config/provider.js";
import { getActiveStorage } from "./oss/file/service.js";
import { OssConfigProvider } from "./oss/config/provider.js";
import { utils as baseConfigUtils } from "./base/sys_config/service.js";
import baseLogService from "./base/log/service.js";
import { sendWebhookNotification } from "./base/webhook_config/notifier.js";
import { getDefaultConfig as aiGetDefaultConfig } from "./ai/config/service.js";
import { AiConfigProvider } from "./ai/config/provider.js";
import { runAiChat, runAiEmbedding } from "./ai/driver.js";
import aiSearchService from "./ai/search/service.js";
import aiChatService from "./ai/chat/service.js";
import { SwarmDockerConfigProvider } from "./swarm/docker_config/provider.js";
import {
  safeFetch,
  safeFetchJson,
  safeFetchText,
  type SafeFetchOptions,
} from "@hodor/core/utils/safeFetch";

// 1. 组装各领域模块的具体服务实现
export const systemRegister = {
  ...userUtils,
  ...rolePermissionUtils,
  ...roleUtils,
};

export const baseRegister = {
  sysConfig: baseConfigUtils,
  log: baseLogService,
  webhook: {
    send: sendWebhookNotification,
  },
  httpFetch: {
    fetch: (url: string | URL, options?: SafeFetchOptions) =>
      safeFetch(url, {
        logHandler: (logData) => baseLogService.http.add(logData),
        ...options,
      }),
    json: <T = unknown>(url: string | URL, options?: SafeFetchOptions) =>
      safeFetchJson<T>(url, {
        logHandler: (logData) => baseLogService.http.add(logData),
        ...options,
      }),
    text: (url: string | URL, options?: SafeFetchOptions) =>
      safeFetchText(url, {
        logHandler: (logData) => baseLogService.http.add(logData),
        ...options,
      }),
  },
};

export const i18nRegister = {
  ...regionUtils,
  ...languageUtils,
  getRegion: async (id: number) => {
    return await regionService.get.service({ id });
  },
};

export const maintenanceRegister = {
  recordLogin: loginLogUtils.recordLogin,
  exportDeletionRecord,
  runPendingJobs,
};

export const swarmRegister = Object.assign(dockerClient, {
  configProvider: new SwarmDockerConfigProvider(),
});

export const rpaRegister = {
  findDefaultActiveConfig,
  configProvider: new RpaConfigProvider(),
};

export const ossRegister = {
  getActiveStorage,
  configProvider: new OssConfigProvider(),
};

export const aiRegister = {
  getDefaultConfig: aiGetDefaultConfig,
  configProvider: new AiConfigProvider(),
  runAiChat,
  runAiEmbedding,
  ask: aiChatService.ask.service,
  search: aiSearchService.search.service,
};

import mailActionService from "./mail/action/service.js";
import mailAccountService from "./mail/account/service.js";
import mailTemplateService from "./mail/template/service.js";
import mailLogService from "./mail/log/service.js";
import mailRecipientService from "./mail/recipient/service.js";

export const mailRegister = {
  send: async (
    params: Parameters<typeof mailActionService.send.service>[0],
    userObj?: any
  ) => {
    return await mailActionService.send.service(
      params,
      userObj || { id: 0, username: "system", langCode: "zh-CN", roleIdArr: [] }
    );
  },
  account: mailAccountService,
  template: mailTemplateService,
  log: mailLogService,
  recipient: {
    list: async (
      params: Parameters<typeof mailRecipientService.list.service>[0]
    ) => await mailRecipientService.list.service(params),
    add: async (
      params: Parameters<typeof mailRecipientService.add.service>[0],
      userObj?: import("@hodor/core/types/app").UserObj
    ) =>
      await mailRecipientService.add.service(
        params,
        userObj ||
          ({
            id: 0,
            username: "system",
            langCode: "zh-CN",
            roleIds: [],
            permissions: [],
            dataScope: "all",
            customDeptIds: [],
            isSuperAdmin: true,
            token: "",
            userId: 0,
            isEnabled: true,
            ensureLoaded: async () => {},
          } as unknown as import("@hodor/core/types/app").UserObj)
      ),
    update: async (
      params: Parameters<typeof mailRecipientService.update.service>[0],
      userObj?: import("@hodor/core/types/app").UserObj
    ) =>
      await mailRecipientService.update.service(
        params,
        userObj ||
          ({
            id: 0,
            username: "system",
            langCode: "zh-CN",
            roleIds: [],
            permissions: [],
            dataScope: "all",
            customDeptIds: [],
            isSuperAdmin: true,
            token: "",
            userId: 0,
            isEnabled: true,
            ensureLoaded: async () => {},
          } as unknown as import("@hodor/core/types/app").UserObj)
      ),
    delete: async (
      params: Parameters<typeof mailRecipientService.delete.service>[0]
    ) => await mailRecipientService.delete.service(params),
    get: async (
      params: Parameters<typeof mailRecipientService.get.service>[0]
    ) => await mailRecipientService.get.service(params),
  },
};

import { MqttConfigProvider } from "./mqtt/config/provider.js";
import mqttService from "./mqtt/service.js";

export const mqttRegister = {
  publish: mqttService.publish.service,
  logs: mqttService.logs.service,
  configProvider: new MqttConfigProvider(),
};

import { voiceConfigProvider } from "./voice/driver.js";

export const voiceRegister = {
  configProvider: voiceConfigProvider,
};

// 2. 初始化注册中心并绑定服务
export function initAdminRegistry() {
  const reg = new ServiceRegistry();

  reg.register("system", systemRegister);
  reg.register("i18n", i18nRegister);
  reg.register("maintenance", maintenanceRegister);
  reg.register("swarm_docker", swarmRegister);
  reg.register("rpa", rpaRegister);
  reg.register("oss", ossRegister);
  reg.register("ai", aiRegister);
  reg.register("base", baseRegister);
  reg.register("mail", mailRegister);
  reg.register("mqtt", mqttRegister);
  reg.register("voice", voiceRegister);
  console.log(`[ADMIN] registered domains`, reg.domains);
  setRegistry(reg);
}
