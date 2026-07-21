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
import { getDefaultConfig as aiGetDefaultConfig } from "./ai/config/service.js";
import { AiConfigProvider } from "./ai/config/provider.js";
import { SwarmDockerConfigProvider } from "./swarm/docker_config/provider.js";

// 1. 组装各领域模块的具体服务实现
export const systemRegister = {
  ...userUtils,
  ...rolePermissionUtils,
  ...roleUtils,
};

export const baseRegister = {
  sysConfig: baseConfigUtils,
  log: baseLogService,
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
  console.log(`[ADMIN] registered domains`, reg.domains);
  setRegistry(reg);
}
