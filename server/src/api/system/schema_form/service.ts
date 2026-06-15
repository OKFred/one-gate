import { utils as userUtils } from "@/api/system/user/service";
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
import type { UserObj, RequiredKeys } from "@/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import { preventEmpty } from "@/middleware/auth/prevention";
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
  const creatorName = await userUtils.getUserNameById(creatorId);

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
  const updaterName = await userUtils.getUserNameById(updaterId);

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

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
