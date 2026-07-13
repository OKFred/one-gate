import { registry } from "../../common/registry.js";
import { can } from "@hodor/core/middleware/auth/permission";
import {
  IndexVO,
  SchemaFormVO,
  SchemaFormListVO,
  SchemaFormAddVO,
  SchemaFormUpdateVO,
  SchemaFormListKeys,
  SchemaFormDetailKeys,
  SchemaFormGetKeys,
  SchemaFormDeleteKeys,
  SchemaFormAddKeys,
  SchemaFormUpdateKeys,
  SchemaFormSortableKeys,
  type SchemaFormPOLike,
  type SchemaFormVOLike,
  type SchemaFormAddVOLike,
  type SchemaFormUpdateVOLike,
  type SchemaFormDeleteVOLike,
  type SchemaFormGetVOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { schemaFormRepository } from "./repository";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: SchemaFormVO["isEnabled"],
    orderBy: orderByWrapper<(keyof SchemaFormPOLike)[]>(SchemaFormSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<SchemaFormPOLike>[]>(
    {
      ...SchemaFormListVO,
    },
    [...SchemaFormListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
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

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取动态表单列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...SchemaFormAddVO,
  } satisfies Partial<Record<keyof SchemaFormAddVOLike, JSONSchema>>,
  required: [
    ...SchemaFormAddKeys,
  ] as const satisfies RequiredKeys<SchemaFormAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const creatorName = await registry.system.getUserNameById(creatorId);

  const updateData = {
    ...params,
    creatorId,
    creatorName,
  };
  const insertedId = await schemaFormRepository.onInsert(updateData);
  return insertedId;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加动态表单",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...SchemaFormUpdateVO,
  },
  required: [
    ...SchemaFormUpdateKeys,
  ] as const satisfies RequiredKeys<SchemaFormUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  // 获取当前记录
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

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新动态表单",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...SchemaFormDeleteKeys,
  ] as const satisfies RequiredKeys<SchemaFormDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  if (id === undefined) return null;

  const deletedId = await schemaFormRepository.onDelete(id);
  return deletedId;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除动态表单",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    id: { type: "number" },
    code: { type: "string" },
  },
  anyOf: [{ required: ["id"] }, { required: ["code"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...SchemaFormVO,
  },
  required: [
    ...SchemaFormDetailKeys,
  ] as const satisfies RequiredKeys<SchemaFormVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id, code } = params;
  let row = null;
  if (id) {
    row = await schemaFormRepository.findById(id);
  } else if (code) {
    row = await schemaFormRepository.findByCode(code);
  }
  preventEmpty(row);
  return row;
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

function cleanSchema(schema: any): any {
  if (schema === null || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(cleanSchema);
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(schema)) {
    if (key === "example" || key === "examples" || key === "description") {
      continue;
    }
    result[key] = cleanSchema(schema[key]);
  }
  return result;
}

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

  // 从全局 registry 获取当前版本号
  const { getVersionHash } = await import("@hodor/core/utils/schemaRegistry");
  const currentVersion = getVersionHash();

  // 版本号一致，返回 notModified
  if (clientVersion && clientVersion === currentVersion) {
    return {
      schemas: {},
      version: currentVersion,
      notModified: true,
    };
  }

  // 鉴权检查：如果是系统资源前缀，校验是否有模块的 read 权限
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

  // 从数据库按前缀模糊查询
  const rows = await schemaFormRepository.findByPrefix(prefix);

  const schemas: Record<string, string> = {};
  for (const row of rows) {
    // 权限校验过滤：只返回用户拥有权限的 schema
    if (
      isSystem &&
      !hasPermissionForSchema(
        row.code,
        userObj.permissions,
        userObj.isSuperAdmin
      )
    ) {
      continue;
    }

    // 清洗无关字段
    try {
      const parsed = JSON.parse(row.schemaData);
      const cleaned = cleanSchema(parsed);
      schemas[row.code] = JSON.stringify(cleaned);
    } catch (e) {
      schemas[row.code] = row.schemaData;
    }
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

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  batch_get: batchGetApi,
};
