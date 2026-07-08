import { registry } from "../../common/registry.js";
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
    summary: "获取动态表单配置列表",
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
    summary: "添加动态表单配置",
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
    summary: "更新动态表单配置",
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
    summary: "删除动态表单配置",
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
    summary: "获取动态表单配置信息",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// ---- batch_get ----
const batchGetReq = {
  type: "object",
  properties: {
    names: {
      type: "array",
      items: { type: "string" },
      description: "要查询的 schema code 列表",
      maxItems: 100,
    },
    version: {
      type: "string",
      description: "客户端缓存的版本号，若与当前一致则返回空数据",
    },
  },
  required: ["names"],
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

async function onBatchGet(
  params: FromSchema<typeof batchGetReq>
): Promise<FromSchema<typeof batchGetRes>> {
  const { names, version: clientVersion } = params;

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

  // 从数据库批量查询
  const rows = await schemaFormRepository.findByCodes(names);
  const schemas: Record<string, string> = {};
  for (const row of rows) {
    schemas[row.code] = row.schemaData;
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
  adapter: bodyAdapter,
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
