import { utils as userUtils } from "@/api/infra/system/user/service";
import {
  IndexVO,
  SchemaFormDataVO,
  SchemaFormDataListVO,
  SchemaFormDataListKeys,
  SchemaFormDataDetailKeys,
  SchemaFormDataGetKeys,
  SchemaFormDataDeleteKeys,
  SchemaFormDataAddKeys,
  SchemaFormDataSortableKeys,
  type SchemaFormDataPOLike,
  type SchemaFormDataDeleteVOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { validate } from "@cfworker/json-schema";
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
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";
import { schemaFormDataRepository } from "./repository";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    formCode: SchemaFormDataVO["formCode"],
    businessId: SchemaFormDataVO["businessId"],
    orderBy: orderByWrapper<(keyof SchemaFormDataPOLike)[]>(
      SchemaFormDataSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<SchemaFormDataPOLike>[]>(
    {
      ...SchemaFormDataListVO,
    },
    [...SchemaFormDataListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await schemaFormDataRepository.findPage({
    formCode: params.formCode,
    businessId: params.businessId,
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
    summary: "获取动态表单提交的数据列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const submitReq = {
  type: "object",
  properties: {
    formCode: { type: "string", minLength: 1 },
    businessId: { type: "number" },
    data: {
      type: "object",
      description: "表单数据 (JSON 对象)",
      additionalProperties: true,
    },
  },
  required: ["formCode", "businessId", "data"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const submitRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onSubmit(
  params: FromSchema<typeof submitReq>,
  userObj: UserObj
): Promise<FromSchema<typeof submitRes> | null> {
  const { userId: creatorId } = userObj;
  const { formCode, businessId, data } = params;

  // 1. 根据 formCode 获取对应的 Schema 配置
  const formConfig = await schemaFormDataRepository.findFormConfig(formCode);
  if (!formConfig) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: [`Schema Form Config not found or disabled for code: ${formCode}`],
    });
  }

  let schemaObj: object;
  try {
    schemaObj = JSON.parse(formConfig.schemaData);
  } catch (e) {
    throw new BusinessError(BusinessErrorCode.UNKNOWN_ERROR, {
      cause: ["Failed to parse Schema Form Data from DB"],
    });
  }

  // 2. 动态校验 JSON Schema
  const { valid, errors } = validate(data, schemaObj, "2020-12");
  if (!valid) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: errors, // 将具体的 schema 校验错误抛给前端
    });
  }

  const dataContent = JSON.stringify(data);

  // 获取当前操作人的用户名
  const username = await userUtils.getUserNameById(creatorId);

  // 3. 检查是否已经存在相同 formCode + businessId 的记录，如果存在则更新(upsert)
  const record = await schemaFormDataRepository.findByFormCodeAndBusinessId(
    formCode,
    businessId
  );

  if (record) {
    const updatedId = await schemaFormDataRepository.onUpdate(record.id, {
      dataContent,
      updaterId: creatorId,
      updaterName: username,
    });
    return updatedId;
  } else {
    // 插入新数据
    const insertedId = await schemaFormDataRepository.onInsert({
      formCode,
      businessId,
      dataContent,
      creatorId,
      creatorName: username,
    });
    return insertedId;
  }
}

const submitApi = {
  req: submitReq,
  res: submitRes,
  pathInfo: {
    path: "/submit",
    method: "post",
    summary: "提交动态表单数据",
  } as const,
  adapter: bodyUserAdapter,
  service: onSubmit,
  permission: { action: "add" }, // 如果需要更细粒度的控制，可以在前端针对不同的业务调整权限点
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...SchemaFormDataDeleteKeys,
  ] as const satisfies RequiredKeys<SchemaFormDataDeleteVOLike>[],
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

  const deletedId = await schemaFormDataRepository.onDelete(id);
  return deletedId;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除动态表单数据",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    id: { type: "number" },
    formCode: { type: "string" },
    businessId: { type: "number" },
  },
  anyOf: [{ required: ["id"] }, { required: ["formCode", "businessId"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...SchemaFormDataVO,
  },
  required: [
    ...SchemaFormDataDetailKeys,
  ] as const satisfies RequiredKeys<SchemaFormDataPOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id, formCode, businessId } = params;
  let row = null;
  if (id) {
    row = await schemaFormDataRepository.findById(id);
  } else if (formCode && businessId) {
    row = await schemaFormDataRepository.findByFormCodeAndBusinessId(
      formCode,
      businessId
    );
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
    summary: "获取动态表单数据详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

export default {
  list: listApi,
  submit: submitApi,
  delete: deleteApi,
  get: getApi,
};
