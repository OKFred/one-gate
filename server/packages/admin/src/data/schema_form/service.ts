import { registry } from "../../common/registry.js";
import { can } from "@hodor/core/middleware/auth/permission";
import { SchemaFormVO, SchemaFormDetailKeys, SchemaFormGetVO } from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminDataSchemaFormBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { schemaFormRepository } from "./repository";
import {
  getSchemasByPrefix,
  getVersionHash,
} from "@hodor/core/utils/schemaRegistry";
import { mergeSchemaSources } from "./schema-source";

const S = adminDataSchemaFormBackendSchemas;

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await schemaFormRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(
    list.map((row) => ({
      ...row,
      source: row.source as "system" | "user",
    })),
    total,
    pageNo,
    finalPageSize
  );
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: creatorId } = userObj;
  const creatorName = await registry.system.getUserNameById(creatorId);

  const insertData = {
    ...params,
    uiSchemaData: params.uiSchemaData ?? null,
    remark: params.remark ?? null,
    source: params.source ?? "user",
    creatorId,
    creatorName,
  };
  const insertedId = await schemaFormRepository.onInsert(insertData);
  return insertedId;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const currentForm = await schemaFormRepository.findById(id);
  preventEmpty(currentForm);
  const updaterName = await registry.system.getUserNameById(updaterId);

  const updateData = {
    ...rest,
    updaterId,
    updaterName,
  };

  const updatedId = await schemaFormRepository.onUpdate(id, updateData);
  return updatedId;
}

async function onDelete(
  params: FromSchema<typeof S.deleteReq>
): Promise<number> {
  const { id } = params;
  const deletedId = await schemaFormRepository.onDelete(id);
  return deletedId;
}

const getReq = {
  type: "object",
  properties: {
    ...SchemaFormGetVO,
  },
  anyOf: [{ required: ["id"] }, { required: ["code"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...SchemaFormVO,
  },
  required: [...SchemaFormDetailKeys] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const { id, code } = params;
  let row: Awaited<ReturnType<typeof schemaFormRepository.findById>> = null;
  if (id) {
    row = await schemaFormRepository.findById(id);
  } else if (code) {
    row = await schemaFormRepository.findByCode(code);
  }
  preventEmpty(row);
  return {
    ...row,
    source: row.source as "system" | "user",
  };
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取动态表单信息",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// ---- batch_get ----
const batchGetReq = {
  type: "object",
  properties: {
    prefix: {
      type: "string",
      description: "要查询的 schema code 前缀（如 admin.ai.chat）",
    },
    version: {
      type: "string",
      description: "客户端缓存的版本号，若与当前一致则返回空数据",
    },
  },
  required: ["prefix"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const batchGetRes = {
  type: "object",
  properties: {
    schemas: {
      type: "object",
      additionalProperties: { type: "string" },
      description: "code → schemaData JSON 字符串 的映射",
    },
    version: {
      type: "string",
      description: "当前全局 schema 版本号",
    },
    notModified: {
      type: "boolean",
      description: "若为 true，表示客户端缓存仍然有效",
    },
  },
  required: ["version", "notModified"],
  additionalProperties: false,
} as const satisfies JSONSchema;

function hasPermissionForSchema(
  rowCode: string,
  permissions: { code: string }[],
  isSuperAdmin: boolean
): boolean {
  if (isSuperAdmin) return true;

  const lowerRowCode = rowCode.toLowerCase();

  return permissions.some((p) => {
    const [resource, action] = p.code.split(":");
    if (!resource || !action) return false;

    const lowerResource = resource.toLowerCase();
    if (!lowerRowCode.startsWith(lowerResource)) return false;

    const remaining = lowerRowCode.slice(lowerResource.length);
    if (remaining.startsWith("_") || remaining.startsWith("-")) {
      return false;
    }

    const lowerAction = action.toLowerCase();
    if (lowerAction === "add") {
      return lowerRowCode.includes("add") || lowerRowCode.includes("create");
    }
    if (lowerAction === "edit" || lowerAction === "update") {
      return lowerRowCode.includes("update") || lowerRowCode.includes("edit");
    }
    if (lowerAction === "delete") {
      return lowerRowCode.includes("delete") || lowerRowCode.includes("remove");
    }
    if (lowerAction === "read") {
      const hasWriteAction = [
        "add",
        "create",
        "update",
        "edit",
        "delete",
        "remove",
      ].some((act) => lowerRowCode.includes(act));
      return !hasWriteAction;
    }

    return false;
  });
}

async function onBatchGet(
  params: FromSchema<typeof batchGetReq>,
  userObj: UserObj
): Promise<FromSchema<typeof batchGetRes>> {
  const { prefix, version: clientVersion } = params;

  const currentVersion = getVersionHash();

  if (clientVersion && clientVersion === currentVersion) {
    return {
      schemas: {},
      version: currentVersion,
      notModified: true,
    };
  }

  const isSystem = /^(admin|enterprise)(\.|$)/.test(prefix);
  if (isSystem) {
    const hasPerm = await can(userObj, "read", prefix);
    if (!hasPerm) {
      return {
        schemas: {},
        version: currentVersion,
        notModified: false,
      };
    }
  }

  const registeredSchemas = getSchemasByPrefix(prefix);
  const rows = await schemaFormRepository.findByPrefix(prefix);
  const mergedSchemas = mergeSchemaSources(registeredSchemas, rows);

  const schemas: Record<string, string> = {};
  for (const [code, schemaData] of mergedSchemas) {
    if (
      isSystem &&
      !hasPermissionForSchema(code, userObj.permissions, userObj.isSuperAdmin)
    ) {
      continue;
    }
    schemas[code] = schemaData;
  }

  return {
    schemas,
    version: currentVersion,
    notModified: false,
  };
}

const batchGetApi = {
  req: batchGetReq,
  res: batchGetRes,
  pathInfo: {
    path: "/batch_get",
    method: "post",
    summary: "批量获取 Schema（支持版本缓存比对）",
  } as const,
  adapter: bodyUserAdapter,
  service: onBatchGet,
  permission: false as const,
} satisfies API;

export default createCrudApis(S, {
  list: { summary: "获取动态表单列表", handler: onList },
  add: { summary: "添加动态表单", handler: onAdd },
  update: { summary: "更新动态表单", handler: onUpdate },
  delete: { summary: "删除动态表单", handler: onDelete },
  extra: {
    get: getApi,
    batch_get: batchGetApi,
  },
});
