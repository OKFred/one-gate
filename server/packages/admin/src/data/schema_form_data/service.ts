import { registry } from "../../common/registry.js";
import {
  IndexVO,
  SchemaFormDataVO,
  SchemaFormDataDetailKeys,
  SchemaFormDataGetVO,
  SchemaFormDataSubmitVO,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { validate } from "@cfworker/json-schema";
import { adminDataSchemaFormDataBackendSchemas } from "@hodor/contracts/resources";
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
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { schemaFormDataRepository } from "./repository";

const S = adminDataSchemaFormDataBackendSchemas;

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
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

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

const submitReq = {
  type: "object",
  properties: {
    ...SchemaFormDataSubmitVO,
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

  const formConfig = await schemaFormDataRepository.findFormConfig(formCode);
  if (!formConfig) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: [`Schema Form Config not found or disabled for code: ${formCode}`],
    });
  }

  let schemaObj: object;
  try {
    schemaObj = JSON.parse(formConfig.schemaData);
  } catch {
    throw new BusinessError(BusinessErrorCode.UNKNOWN_ERROR, {
      cause: ["Failed to parse Schema Form Data from DB"],
    });
  }

  const { valid, errors } = validate(data, schemaObj, "2020-12");
  if (!valid) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      cause: errors,
    });
  }

  const dataContent = JSON.stringify(data);
  const username = await registry.system.getUserNameById(creatorId);

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
  }

  const insertedId = await schemaFormDataRepository.onInsert({
    formCode,
    businessId,
    dataContent,
    creatorId,
    creatorName: username,
  });
  return insertedId;
}

const submitApi = {
  req: submitReq,
  res: submitRes,
  pathInfo: {
    path: "/submit",
    method: "post",
    summary: "提交表单数据",
  } as const,
  adapter: bodyUserAdapter,
  service: onSubmit,
  permission: { action: "add" },
} satisfies API;

async function onDelete(
  params: FromSchema<typeof S.deleteReq>
): Promise<number> {
  const { id } = params;
  const deletedId = await schemaFormDataRepository.onDelete(id);
  return deletedId;
}

const getReq = {
  type: "object",
  properties: {
    ...SchemaFormDataGetVO,
  },
  anyOf: [{ required: ["id"] }, { required: ["formCode", "businessId"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...SchemaFormDataVO,
  },
  required: [...SchemaFormDataDetailKeys] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const { id, formCode, businessId } = params;
  let row: Awaited<ReturnType<typeof schemaFormDataRepository.findById>> = null;
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
    summary: "获取表单数据详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

export default createCrudApis(S, {
  list: { summary: "获取表单数据列表", handler: onList },
  delete: { summary: "删除表单数据", handler: onDelete },
  extra: {
    submit: submitApi,
    get: getApi,
  },
});
