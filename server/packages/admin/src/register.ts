import { ServiceRegistry, setRegistry } from "./common/registry.js";
import { utils as userUtils } from "./system/user/service.js";
import { utils as regionUtils } from "./i18n/region/service.js";
import { utils as languageUtils } from "./i18n/language/service.js";
import regionService from "./i18n/region/service.js";
import { utils as auditUtils } from "./maintenance/audit_login/service.js";
import { exportDeletionRecord } from "./maintenance/compliance/index.js";
import { dockerClient } from "./swarm/docker/client.js";
import { findDefaultActiveBrowser } from "./rpa/browser/repository.js";
import { getActiveStorage } from "./oss/file/service.js";

// 1. 组装各领域模块的具体服务实现
export const systemRegister = {
  ...userUtils,
};

export const i18nRegister = {
  ...regionUtils,
  ...languageUtils,
  getRegion: async (id: number) => {
    return await regionService.get.service({ id });
  },
};

export const maintenanceRegister = {
  recordLogin: auditUtils.recordLogin,
  exportDeletionRecord,
};

export const swarmRegister = dockerClient;

export const rpaRegister = {
  findDefaultActiveBrowser,
};

export const ossRegister = {
  getActiveStorage,
};

// 2. 初始化注册中心并绑定服务
export function initInfraRegistry() {
  const reg = new ServiceRegistry();

  reg.register("system", systemRegister);
  reg.register("i18n", i18nRegister);
  reg.register("maintenance", maintenanceRegister);
  reg.register("swarm", swarmRegister);
  reg.register("rpa", rpaRegister);
  reg.register("oss", ossRegister);
  console.log(`[INFRA] registered domains`, reg.domains);
  setRegistry(reg);
}
