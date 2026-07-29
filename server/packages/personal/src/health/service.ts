import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { healthRepository } from "./repository.js";
import {
  IndexVO,
  MedicalRecordListVO,
  MedicalRecordAddVO,
  MedicalRecordUpdateVO,
  MedicalRecordListKeys,
  MedicalRecordAddKeys,
  MedicalRecordUpdateKeys,
  MedicalRecordSortableKeys,
  type MedicalRecordPOLike,
  type MedicalRecordAddVOLike,
  type MedicalRecordUpdateVOLike,
} from "./model.js";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    category: MedicalRecordListVO["category"],
    orderBy: orderByWrapper<(keyof MedicalRecordPOLike)[]>(
      MedicalRecordSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<MedicalRecordPOLike>[]>(
    {
      ...MedicalRecordListVO,
    },
    [...MedicalRecordListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>,
  userObj: UserObj
): Promise<FromSchema<typeof listRes>> {
  const {
    orderBy = "visitDateUtc",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    category,
    keyword,
  } = params;
  const userId = Number(userObj.id || userObj.userId || 0);
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await healthRepository.findPage({
    keyword,
    category,
    creatorId: userId,
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
    path: "/medical_record/list",
    method: "post",
    summary: "获取当前用户的医疗记录列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MedicalRecordAddVO,
  } satisfies Partial<Record<keyof MedicalRecordAddVOLike, JSONSchema>>,
  required: [
    ...MedicalRecordAddKeys,
  ] as const satisfies RequiredKeys<MedicalRecordAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  type: "object",
  properties: {
    id: IndexVO["id"],
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes>> {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { username?: string; nickname?: string }).nickname ||
    userObj.username ||
    "User";

  const result = await healthRepository.insert({
    ...params,
    cost: params.cost ?? 0,
    hospitalName: params.hospitalName ?? null,
    doctorName: params.doctorName ?? null,
    diagnosis: params.diagnosis ?? null,
    prescription: params.prescription ?? null,
    reportUrl: params.reportUrl ?? null,
    remark: params.remark ?? null,
    creatorId: userId,
    creatorName: userName,
    updaterId: userId,
    updaterName: userName,
  });

  return { id: result.id };
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/medical_record/add",
    method: "post",
    summary: "新增医疗记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MedicalRecordUpdateVO,
  } satisfies Partial<Record<keyof MedicalRecordUpdateVOLike, JSONSchema>>,
  required: [
    ...MedicalRecordUpdateKeys,
  ] as const satisfies RequiredKeys<MedicalRecordUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  type: "object",
  properties: {
    success: { type: "boolean" },
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes>> {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { username?: string; nickname?: string }).nickname ||
    userObj.username ||
    "User";

  const { id, ...updateData } = params;
  await healthRepository.update(id, {
    ...updateData,
    updaterId: userId,
    updaterName: userName,
  });

  return { success: true };
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/medical_record/update",
    method: "post",
    summary: "更新医疗记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    id: IndexVO["id"],
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  type: "object",
  properties: {
    success: { type: "boolean" },
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes>> {
  await healthRepository.delete(params.id);
  return { success: true };
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/medical_record/delete",
    method: "post",
    summary: "删除医疗记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const service = {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
};

export default service;
