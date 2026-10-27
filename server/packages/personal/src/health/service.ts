import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
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

function ownerId(actor: UserObj | undefined): number {
  if (!actor) throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  if (
    actor.principal?.kind !== "user" ||
    !Number.isSafeInteger(actor.principal.userId) ||
    actor.principal.userId <= 0
  )
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return actor.principal.userId;
}

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
  const userId = ownerId(userObj);
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
  const userId = ownerId(userObj);
  const userName = userObj.username;

  const result = await healthRepository.insert({
    category: params.category,
    title: params.title,
    visitDateUtc: params.visitDateUtc,
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
  const userId = ownerId(userObj);
  const userName = userObj.username;

  const updated = await healthRepository.update(userId, params.id, {
    category: params.category,
    title: params.title,
    hospitalName: params.hospitalName,
    doctorName: params.doctorName,
    visitDateUtc: params.visitDateUtc,
    diagnosis: params.diagnosis,
    prescription: params.prescription,
    reportUrl: params.reportUrl,
    cost: params.cost,
    remark: params.remark,
    updaterId: userId,
    updaterName: userName,
  });
  if (updated === null)
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);

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
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes>> {
  const deleted = await healthRepository.delete(ownerId(userObj), params.id);
  if (deleted === null)
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
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
