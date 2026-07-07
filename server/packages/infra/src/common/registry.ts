// 通用类型安全服务注册中心 (Service Registry)
// 子模块的具体类型契约将通过 TypeScript 声明合并 (Declaration Merging) 动态注入，以保证类型唯一源。

export interface IInfraServices {
  // 留空，由具体装配文件（例如 register.ts）通过 declare module 动态扩充属性和方法类型
}

export class ServiceRegistry {
  private services: Partial<IInfraServices> = {};

  register<K extends keyof IInfraServices>(domain: K, impl: IInfraServices[K]) {
    this.services[domain] = impl;
  }

  public get domains(): IInfraServices {
    return new Proxy(this.services, {
      get: (target, prop) => {
        const domain = prop as keyof IInfraServices;
        const service = target[domain];
        if (!service) {
          throw new Error(
            `[ServiceRegistry] Domain service '${String(prop)}' is not registered yet. ` +
              `Ensure 'initInfraRegistry()' is called at bootstrap.`
          );
        }
        return service;
      },
    }) as unknown as IInfraServices;
  }
}

let currentRegistry: ServiceRegistry | null = null;

// 提供给消费端简洁调用的代理对象，其属性和方法类型完全与 IInfraServices 对齐
export const registry = new Proxy(
  {},
  {
    get: (target, prop) => {
      return getActiveRegistry().domains[prop as keyof IInfraServices];
    },
  }
) as unknown as IInfraServices;

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
