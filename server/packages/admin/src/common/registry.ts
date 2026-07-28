// 通用类型安全服务注册中心 (Service Registry)
// 引入装配常量的推导类型，构建唯一的类型安全层，杜绝在开发环境下 IDE 类型缺失的问题
import type {
  systemRegister,
  baseRegister,
  i18nRegister,
  maintenanceRegister,
  swarmRegister,
  rpaRegister,
  ossRegister,
  aiRegister,
  mailRegister,
  mqttRegister,
  voiceRegister,
} from "../register.js";

export interface IAdminServices {
  system: typeof systemRegister;
  base: typeof baseRegister;
  i18n: typeof i18nRegister;
  maintenance: typeof maintenanceRegister;
  swarm_docker: typeof swarmRegister;
  rpa: typeof rpaRegister;
  oss: typeof ossRegister;
  ai: typeof aiRegister;
  mail: typeof mailRegister;
  mqtt: typeof mqttRegister;
  voice: typeof voiceRegister;
}

export class ServiceRegistry {
  private services: Partial<IAdminServices> = {};

  register<K extends keyof IAdminServices>(domain: K, impl: IAdminServices[K]) {
    this.services[domain] = impl;
  }

  public get domains(): IAdminServices {
    return new Proxy(this.services, {
      get: (target, prop) => {
        const domain = prop as keyof IAdminServices;
        const service = target[domain];
        if (!service) {
          throw new Error(
            `[ServiceRegistry] Domain service '${String(prop)}' is not registered yet. ` +
              `Ensure 'initAdminRegistry()' is called at bootstrap.`
          );
        }
        return service;
      },
    }) as unknown as IAdminServices;
  }
}

let currentRegistry: ServiceRegistry | null = null;

// 提供给消费端简洁调用的代理对象，其属性和方法类型完全与 IAdminServices 对齐
export const registry = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop === "__getDomains")
        return Object.keys(getActiveRegistry()["services"]);
      return getActiveRegistry().domains[prop as keyof IAdminServices];
    },
    ownKeys: () => {
      return Object.keys(getActiveRegistry()["services"]);
    },
    getOwnPropertyDescriptor: (target, prop) => {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  }
) as unknown as IAdminServices & { __getDomains: () => string[] };

function getActiveRegistry(): ServiceRegistry {
  if (!currentRegistry) {
    throw new Error(
      `[ServiceRegistry] Registry has not been initialized. ` +
        `Make sure 'setRegistry()' is called during application bootstrap.`
    );
  }
  return currentRegistry;
}

export function setRegistry(reg: ServiceRegistry) {
  currentRegistry = reg;
}
