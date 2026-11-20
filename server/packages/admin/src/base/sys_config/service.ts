import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { adminBaseSysConfigBackendSchemas } from "@hodor/contracts/resources";
import type { UserObj } from "@hodor/core/types/app";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import {
  isPostgresBackend,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import { registry, type IAdminServices } from "../../common/registry";
import {
  NamespacesResKeys,
  NamespacesResVO,
  type BaseSysConfigInsertPOLike,
  type IDomainConfigProvider,
} from "./model";
import * as baseSysConfigRepository from "./repository";

const S = adminBaseSysConfigBackendSchemas;

/**
 * 从注册中心动态查找指定命名空间的 IDomainConfigProvider。
 * 各领域自行将 configProvider 挂到自己的 registry 注册项中，
 * base 层不感知具体领域的存在，完全依赖倒置。
 */
export function getProvider(namespace: string): IDomainConfigProvider | null {
  try {
    const domainService = registry[namespace as keyof IAdminServices] as
      Record<string, unknown> | undefined;
    if (domainService?.configProvider) {
      return domainService.configProvider as IDomainConfigProvider;
    }
  } catch {
    // 领域未注册，返回 null
  }
  return null;
}

export async function getMergedConfig(namespace: string) {
  const provider = getProvider(namespace);
  if (!provider) {
    throw new Error(`Provider for namespace ${namespace} not found`);
  }
  const defaultValues = provider.getDefaultValues();
  const dbConfig =
    await baseSysConfigRepository.findPrimaryByNamespace(namespace);

  if (dbConfig) {
    let parsedValue: Record<string, unknown> = {};
    try {
      parsedValue = (
        typeof dbConfig.configValue === "string"
          ? JSON.parse(dbConfig.configValue)
          : dbConfig.configValue
      ) as Record<string, unknown>;
    } catch {
      // ignore JSON parse error
    }
    return { ...defaultValues, ...parsedValue };
  }
  return defaultValues;
}

/** 按命名空间和配置键精确读取单条配置，不回退到主配置。 */
export async function getConfigByKey(namespace: string, configKey: string) {
  const row = await baseSysConfigRepository.findByNamespaceAndKey(
    namespace,
    configKey
  );
  if (!row) return null;
  return {
    ...row,
    configValue:
      typeof row.configValue === "string"
        ? (JSON.parse(row.configValue) as unknown)
        : row.configValue,
  };
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await baseSysConfigRepository.findPage({
    ...params,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  const mappedList = list.map((item) => ({
    ...item,
    configValue: (typeof item.configValue === "string"
      ? JSON.parse(item.configValue)
      : item.configValue) as Record<string, unknown>,
  }));

  return buildPagedListResult(mappedList, total, pageNo, finalPageSize);
}

async function addConfiguration(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: creatorId } = userObj;

  if (obj.isPrimary) {
    await baseSysConfigRepository.resetPrimaryFlags(obj.namespace);
  }

  const insertedId = await baseSysConfigRepository.onInsert({
    ...obj,
    configValue:
      typeof obj.configValue === "string"
        ? obj.configValue
        : JSON.stringify(obj.configValue),
    creatorId,
  });
  if (isPostgresBackend()) preventEmpty(insertedId);

  return insertedId;
}

export function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const operation = () => addConfiguration(obj, userObj);
  return isPostgresBackend()
    ? withPostgresTransaction(operation, { write: true })
    : operation();
}

async function updateConfiguration(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const existing = await baseSysConfigRepository.findById(id);
  preventEmpty(existing);

  if (params.isPrimary) {
    await baseSysConfigRepository.resetPrimaryFlags(existing.namespace, id);
  }

  const updateData: Partial<BaseSysConfigInsertPOLike> = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  if (rest.configValue !== undefined) {
    updateData.configValue =
      typeof rest.configValue === "string"
        ? rest.configValue
        : JSON.stringify(rest.configValue);
  }

  const updateRow = await baseSysConfigRepository.onUpdate(id, updateData);
  preventEmpty(updateRow);
  return updateRow.id;
}

export function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const operation = () => updateConfiguration(params, userObj);
  return isPostgresBackend()
    ? withPostgresTransaction(operation, { write: true })
    : operation();
}

async function onDetail(params: FromSchema<typeof S.getReq>) {
  const row = await baseSysConfigRepository.findById(params.id);
  preventEmpty(row);
  return {
    ...row,
    configValue: (typeof row.configValue === "string"
      ? JSON.parse(row.configValue)
      : row.configValue) as Record<string, unknown>,
  };
}

const detailApi = {
  req: S.getReq,
  res: S.getRes,
  pathInfo: { path: "/detail", method: "post", summary: "获取配置详情" },
  adapter: bodyAdapter,
  service: onDetail,
  permission: { action: "read" },
} satisfies API;

async function onDelete(obj: FromSchema<typeof S.deleteReq>) {
  const deletedRow = await baseSysConfigRepository.onDelete(obj.id);
  preventEmpty(deletedRow);
  return deletedRow.id;
}

const schemaReq = {
  type: "object",
  properties: { namespace: { type: "string", description: "命名空间" } },
  required: ["namespace"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onSchema(params: FromSchema<typeof schemaReq>) {
  const provider = getProvider(params.namespace);
  if (!provider) {
    throw new Error(`Provider for namespace ${params.namespace} not found`);
  }
  return {
    schema: provider.getJsonSchema(),
    defaultValues: provider.getDefaultValues(),
  };
}

const schemaApi = {
  req: schemaReq,
  res: {
    type: "object",
    properties: {
      schema: { type: "object", additionalProperties: true },
      defaultValues: { type: "object", additionalProperties: true },
    },
    required: ["schema", "defaultValues"],
  },
  pathInfo: { path: "/schema", method: "post", summary: "获取领域配置Schema" },
  adapter: bodyAdapter,
  service: onSchema,
  permission: { action: "read" },
} satisfies API;

const namespacesApi = {
  req: {
    type: "object",
    additionalProperties: false,
  } as const satisfies JSONSchema,
  res: {
    type: "array",
    items: {
      type: "object",
      properties: { ...NamespacesResVO },
      required: [...NamespacesResKeys],
    },
  } as const satisfies JSONSchema,
  pathInfo: {
    path: "/namespaces",
    method: "post",
    summary: "获取已注册配置的命名空间",
  },
  adapter: bodyAdapter,
  service: async () => {
    const namespaces: { namespace: string }[] = [];
    for (const key of Object.keys(registry)) {
      const domainService = registry[key as keyof IAdminServices];
      if (
        domainService &&
        typeof domainService === "object" &&
        "configProvider" in domainService &&
        domainService.configProvider
      ) {
        namespaces.push({ namespace: key });
      }
    }
    return namespaces;
  },
  permission: { action: "read" },
} satisfies API;

export const utils = {
  getProvider,
  getMergedConfig,
  getConfigByKey,
  list: onList,
  detail: onDetail,
  add: onAdd,
  update: onUpdate,
  delete: onDelete,
};

export default createCrudApis(S, {
  list: { handler: onList, summary: "分页获取系统配置" },
  add: { handler: onAdd, summary: "添加配置" },
  update: { handler: onUpdate, summary: "更新配置" },
  delete: { handler: onDelete, summary: "删除配置" },
  extra: {
    detail: detailApi,
    schema: schemaApi,
    namespaces: namespacesApi,
  },
});
