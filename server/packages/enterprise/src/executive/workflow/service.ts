import {
  IndexVO,
  WorkflowVO,
  WorkflowAddVO,
  WorkflowUpdateVO,
  WorkflowAddKeys,
  WorkflowUpdateKeys,
  WorkflowDeleteKeys,
  WorkflowGetKeys,
  WorkflowListKeys,
  WorkflowSortableKeys,
  type WorkflowPOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listAllReqBase,
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
import * as repository from "./repository";
import { runWorkflow } from "./engine";

//====================================================================
// 1. Workflow APIs
//====================================================================

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: WorkflowVO["isEnabled"],
    orderBy: orderByWrapper<(keyof WorkflowPOLike)[]>(WorkflowSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...IndexVO,
      name: WorkflowVO["name"],
      isEnabled: WorkflowVO["isEnabled"],
    },
    required: ["id", "name", "isEnabled"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await repository.findWorkflowPageAll(params);
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: { path: "/listAll", method: "post", summary: "获取所有工作流" },
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: WorkflowVO["isEnabled"],
    orderBy: orderByWrapper<(keyof WorkflowPOLike)[]>(WorkflowSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<WorkflowPOLike>[]>({ ...WorkflowVO }, [
    ...WorkflowListKeys,
  ]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await repository.findWorkflowPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取工作流" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...WorkflowAddVO },
  required: [...WorkflowAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  // @ts-ignore
  const insertedId = await repository.onWorkflowInsert({
    ...obj,
    creatorId,
  });
  return insertedId || null;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "新建工作流" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...WorkflowUpdateVO },
  required: [...WorkflowUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;
  await onGet({ id: id as number });

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  // @ts-ignore
  const row = await repository.onWorkflowUpdate(id as number, updateData);
  preventEmpty(row);
  return row.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新工作流" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 详情
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...WorkflowGetKeys],
} as const satisfies JSONSchema;

async function onGet(params: FromSchema<typeof getReq>) {
  const row = await repository.findWorkflowById(params.id as number);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...WorkflowVO },
    required: ["id", "name", "flowData", "isEnabled"],
  },
  pathInfo: { path: "/get", method: "post", summary: "工作流详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  const row = await repository.onWorkflowDelete(obj.id as number);
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: getReq,
  res: addRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除工作流" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 执行工作流
async function onRun(obj: FromSchema<typeof getReq>) {
  await runWorkflow(obj.id as number, "manual").catch((err) => {
    console.error(`Workflow engine execute failed async:`, err);
  });

  return true;
}

const runApi = {
  req: getReq,
  res: { type: "boolean" },
  pathInfo: { path: "/run", method: "post", summary: "手动运行工作流" },
  adapter: bodyAdapter,
  service: onRun,
  permission: { action: "edit" },
} satisfies API;

//====================================================================
// 3. Workflow Log APIs
//====================================================================

const listLogsReq = {
  type: "object",
  properties: {
    pageNo: { type: "number" },
    pageSize: { type: "number" },
    workflowId: { type: "number" },
  },
  required: ["workflowId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listLogsRes = {
  type: "object",
  properties: {
    total: { type: "number" },
    totalPage: { type: "number" },
    currentPage: { type: "number" },
    pageSize: { type: "number" },
    list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          workflowId: { type: "number" },
          status: { type: "string" },
          triggerType: { type: "string" },
          startTimeUtc: { type: "number" },
          endTimeUtc: { type: ["number", "null"], nullable: true },
          logs: { type: ["string", "null"], nullable: true },
          creatorId: { type: "number" },
          createTimeUtc: { type: "number" },
        },
        required: ["id", "workflowId", "status", "triggerType", "startTimeUtc"],
      },
    },
  },
  required: ["total", "totalPage", "currentPage", "pageSize", "list"],
} as const satisfies JSONSchema;

async function onListLogs(
  params: FromSchema<typeof listLogsReq>
): Promise<FromSchema<typeof listLogsRes>> {
  const { pageNo = 1, pageSize = 10, workflowId } = params;
  const { total, list } = await repository.findLogPage({
    pageNo,
    pageSize,
    workflowId: workflowId as number,
  });

  return {
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
    list,
  };
}

const listLogsApi = {
  req: listLogsReq,
  res: listLogsRes,
  pathInfo: {
    path: "/log/list",
    method: "post",
    summary: "分页查询工作流执行日志",
  },
  adapter: bodyAdapter,
  service: onListLogs,
  permission: { action: "read" },
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  get: getApi,
  delete: deleteApi,
  run: runApi,

  listLogs: listLogsApi,
};
