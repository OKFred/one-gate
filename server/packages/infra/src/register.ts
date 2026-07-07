import { ServiceRegistry, setRegistry } from "./common/registry.js";
import { utils as userUtils } from "./system/user/service.js";
import { utils as regionUtils } from "./i18n/region/service.js";
import { utils as languageUtils } from "./i18n/language/service.js";
import regionService from "./i18n/region/service.js";
import { utils as auditUtils } from "./maintenance/audit_login/service.js";
import { exportDeletionRecord } from "./maintenance/compliance/index.js";

// 1. 组装各领域模块的具体服务实现
const systemRegister = {
  ...userUtils,
};

const i18nRegister = {
  ...regionUtils,
  ...languageUtils,
  getRegion: async (id: number) => {
    return await regionService.get.service({ id });
  },
};

const maintenanceRegister = {
  recordLogin: auditUtils.recordLogin,
  exportDeletionRecord,
};

// 2. 初始化注册中心并绑定服务
export function initInfraRegistry() {
  const reg = new ServiceRegistry();

  reg.register("system", systemRegister);
  reg.register("i18n", i18nRegister);
  reg.register("maintenance", maintenanceRegister);
  console.log(`[INFRA] registered domains`, reg.domains);
  setRegistry(reg);
}

// 3. 通过声明合并将装配好的对象类型注入到 IInfraServices 中，实现唯一类型源，避免类型与实现脱节
declare module "./common/registry.js" {
  interface IInfraServices {
    system: typeof systemRegister;
    i18n: typeof i18nRegister;
    maintenance: typeof maintenanceRegister;
  }
}
