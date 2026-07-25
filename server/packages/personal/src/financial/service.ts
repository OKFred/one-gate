import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { financialRepository } from "./repository.js";
import {
  IndexVO,
  IncomeRecordPO,
  IncomeRecordAddVO,
  IncomeRecordUpdateVO,
  ExpenseRecordPO,
  ExpenseRecordAddVO,
  ExpenseRecordUpdateVO,
  FinancialDataSourcePO,
  FinancialDataSourceAddVO,
  FinancialDataSourceUpdateVO,
  type IncomeRecordPOLike,
  type ExpenseRecordPOLike,
  type FinancialDataSourcePOLike,
} from "./model.js";

// ================= Dashboard =================
const dashboardReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

const dashboardRes = {
  type: "object",
  properties: {
    totalIncome: { type: "number" },
    totalExpense: { type: "number" },
    netBalance: { type: "number" },
    savingsRate: { type: "number" },
    incomeBreakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          amount: { type: "number" },
        },
        required: ["category", "amount"],
        additionalProperties: false,
      },
    },
    expenseBreakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          amount: { type: "number" },
        },
        required: ["category", "amount"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "totalIncome",
    "totalExpense",
    "netBalance",
    "savingsRate",
    "incomeBreakdown",
    "expenseBreakdown",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDashboard(
  _params: FromSchema<typeof dashboardReq>,
  userObj: UserObj
): Promise<FromSchema<typeof dashboardRes>> {
  const userId = Number(userObj.id || userObj.userId || 0);
  return await financialRepository.getDashboardStats(userId);
}

const dashboardApi = {
  req: dashboardReq,
  res: dashboardRes,
  pathInfo: {
    path: "/dashboard",
    method: "post",
    summary: "财务总览仪表盘数据",
  },
  adapter: bodyUserAdapter,
  service: onDashboard,
  permission: { action: "read" },
} satisfies API;

// ================= Income CRUD =================
const incomeListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    sourceCategory: IncomeRecordPO["sourceCategory"],
    orderBy: orderByWrapper<(keyof IncomeRecordPOLike)[]>([
      "id",
      "amount",
      "incomeDateUtc",
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const incomeListRes = {
  ...listResponseWrapper<RequiredKeys<IncomeRecordPOLike>[]>(
    { ...IncomeRecordPO },
    [
      "id",
      "sourceCategory",
      "amount",
      "incomeDateUtc",
      "creatorId",
      "createTimeUtc",
    ]
  ),
} as const satisfies JSONSchema;

async function onIncomeList(
  params: FromSchema<typeof incomeListReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const { total, list } = await financialRepository.findIncomePage({
    ...params,
    creatorId: userId,
  });
  const totalPage = Math.ceil(total / (params.pageSize || 10));
  return {
    total,
    totalPage,
    currentPage: params.pageNo || 1,
    pageSize: params.pageSize || 10,
    list,
  };
}

const incomeListApi = {
  req: incomeListReq,
  res: incomeListRes,
  pathInfo: { path: "/income/list", method: "post", summary: "收入记录列表" },
  adapter: bodyUserAdapter,
  service: onIncomeList,
  permission: { action: "read" },
} satisfies API;

const incomeAddReq = {
  type: "object",
  properties: { ...IncomeRecordAddVO },
  required: ["sourceCategory", "amount", "incomeDateUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const incomeAddRes = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onIncomeAdd(
  params: FromSchema<typeof incomeAddReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const res = await financialRepository.insertIncome({
    ...params,
    payer: params.payer ?? null,
    remark: params.remark ?? null,
    dataTaskId: params.dataTaskId ?? null,
    creatorId: userId,
    creatorName: userName,
    updaterId: userId,
    updaterName: userName,
  });
  return { id: res.id };
}

const incomeAddApi = {
  req: incomeAddReq,
  res: incomeAddRes,
  pathInfo: { path: "/income/add", method: "post", summary: "新增收入记录" },
  adapter: bodyUserAdapter,
  service: onIncomeAdd,
  permission: { action: "add" },
} satisfies API;

const incomeUpdateReq = {
  type: "object",
  properties: { ...IncomeRecordUpdateVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const incomeUpdateRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onIncomeUpdate(
  params: FromSchema<typeof incomeUpdateReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const { id, ...data } = params;
  await financialRepository.updateIncome(id, {
    ...data,
    updaterId: userId,
    updaterName: userName,
  });
  return { success: true };
}

const incomeUpdateApi = {
  req: incomeUpdateReq,
  res: incomeUpdateRes,
  pathInfo: { path: "/income/update", method: "post", summary: "更新收入记录" },
  adapter: bodyUserAdapter,
  service: onIncomeUpdate,
  permission: { action: "edit" },
} satisfies API;

const incomeDeleteReq = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const incomeDeleteRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onIncomeDelete(params: FromSchema<typeof incomeDeleteReq>) {
  await financialRepository.deleteIncome(params.id);
  return { success: true };
}

const incomeDeleteApi = {
  req: incomeDeleteReq,
  res: incomeDeleteRes,
  pathInfo: { path: "/income/delete", method: "post", summary: "删除收入记录" },
  adapter: bodyUserAdapter,
  service: onIncomeDelete,
  permission: { action: "delete" },
} satisfies API;

// ================= Expense CRUD =================
const expenseListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    expenseCategory: ExpenseRecordPO["expenseCategory"],
    orderBy: orderByWrapper<(keyof ExpenseRecordPOLike)[]>([
      "id",
      "amount",
      "expenseDateUtc",
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const expenseListRes = {
  ...listResponseWrapper<RequiredKeys<ExpenseRecordPOLike>[]>(
    { ...ExpenseRecordPO },
    [
      "id",
      "expenseCategory",
      "amount",
      "expenseDateUtc",
      "creatorId",
      "createTimeUtc",
    ]
  ),
} as const satisfies JSONSchema;

async function onExpenseList(
  params: FromSchema<typeof expenseListReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const { total, list } = await financialRepository.findExpensePage({
    ...params,
    creatorId: userId,
  });
  const totalPage = Math.ceil(total / (params.pageSize || 10));
  return {
    total,
    totalPage,
    currentPage: params.pageNo || 1,
    pageSize: params.pageSize || 10,
    list,
  };
}

const expenseListApi = {
  req: expenseListReq,
  res: expenseListRes,
  pathInfo: { path: "/expense/list", method: "post", summary: "支出记录列表" },
  adapter: bodyUserAdapter,
  service: onExpenseList,
  permission: { action: "read" },
} satisfies API;

const expenseAddReq = {
  type: "object",
  properties: { ...ExpenseRecordAddVO },
  required: ["expenseCategory", "amount", "expenseDateUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const expenseAddRes = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onExpenseAdd(
  params: FromSchema<typeof expenseAddReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const res = await financialRepository.insertExpense({
    ...params,
    payee: params.payee ?? null,
    paymentMethod: params.paymentMethod ?? null,
    remark: params.remark ?? null,
    dataTaskId: params.dataTaskId ?? null,
    creatorId: userId,
    creatorName: userName,
    updaterId: userId,
    updaterName: userName,
  });
  return { id: res.id };
}

const expenseAddApi = {
  req: expenseAddReq,
  res: expenseAddRes,
  pathInfo: { path: "/expense/add", method: "post", summary: "新增支出记录" },
  adapter: bodyUserAdapter,
  service: onExpenseAdd,
  permission: { action: "add" },
} satisfies API;

const expenseUpdateReq = {
  type: "object",
  properties: { ...ExpenseRecordUpdateVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const expenseUpdateRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onExpenseUpdate(
  params: FromSchema<typeof expenseUpdateReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const { id, ...data } = params;
  await financialRepository.updateExpense(id, {
    ...data,
    updaterId: userId,
    updaterName: userName,
  });
  return { success: true };
}

const expenseUpdateApi = {
  req: expenseUpdateReq,
  res: expenseUpdateRes,
  pathInfo: {
    path: "/expense/update",
    method: "post",
    summary: "更新支出记录",
  },
  adapter: bodyUserAdapter,
  service: onExpenseUpdate,
  permission: { action: "edit" },
} satisfies API;

const expenseDeleteReq = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const expenseDeleteRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onExpenseDelete(params: FromSchema<typeof expenseDeleteReq>) {
  await financialRepository.deleteExpense(params.id);
  return { success: true };
}

const expenseDeleteApi = {
  req: expenseDeleteReq,
  res: expenseDeleteRes,
  pathInfo: {
    path: "/expense/delete",
    method: "post",
    summary: "删除支出记录",
  },
  adapter: bodyUserAdapter,
  service: onExpenseDelete,
  permission: { action: "delete" },
} satisfies API;

// ================= Data Sources CRUD & Sync Trigger =================
const dataSourceListReq = {
  type: "object",
  properties: { ...listReqBase },
  additionalProperties: false,
} as const satisfies JSONSchema;

const dataSourceListRes = {
  ...listResponseWrapper<RequiredKeys<FinancialDataSourcePOLike>[]>(
    { ...FinancialDataSourcePO },
    [
      "id",
      "sourceName",
      "sourceType",
      "fieldMappingJson",
      "isEnabled",
      "creatorId",
      "createTimeUtc",
    ]
  ),
} as const satisfies JSONSchema;

async function onDataSourceList(
  params: FromSchema<typeof dataSourceListReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const { total, list } = await financialRepository.findDataSourcePage({
    ...params,
    creatorId: userId,
  });
  const totalPage = Math.ceil(total / (params.pageSize || 10));
  return {
    total,
    totalPage,
    currentPage: params.pageNo || 1,
    pageSize: params.pageSize || 10,
    list,
  };
}

const dataSourceListApi = {
  req: dataSourceListReq,
  res: dataSourceListRes,
  pathInfo: {
    path: "/data_source/list",
    method: "post",
    summary: "数据源配置列表",
  },
  adapter: bodyUserAdapter,
  service: onDataSourceList,
  permission: { action: "read" },
} satisfies API;

const dataSourceAddReq = {
  type: "object",
  properties: { ...FinancialDataSourceAddVO },
  required: ["sourceName", "sourceType", "fieldMappingJson"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const dataSourceAddRes = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDataSourceAdd(
  params: FromSchema<typeof dataSourceAddReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const res = await financialRepository.insertDataSource({
    ...params,
    apiTaskId: params.apiTaskId ?? null,
    schemaFormCode: params.schemaFormCode ?? null,
    syncCron: params.syncCron ?? null,
    isEnabled: params.isEnabled ?? true,
    lastSyncTimeUtc: null,
    creatorId: userId,
    creatorName: userName,
    updaterId: userId,
    updaterName: userName,
  });
  return { id: res.id };
}

const dataSourceAddApi = {
  req: dataSourceAddReq,
  res: dataSourceAddRes,
  pathInfo: {
    path: "/data_source/add",
    method: "post",
    summary: "新增数据源配置",
  },
  adapter: bodyUserAdapter,
  service: onDataSourceAdd,
  permission: { action: "add" },
} satisfies API;

const dataSourceUpdateReq = {
  type: "object",
  properties: { ...FinancialDataSourceUpdateVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const dataSourceUpdateRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDataSourceUpdate(
  params: FromSchema<typeof dataSourceUpdateReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const { id, ...data } = params;
  await financialRepository.updateDataSource(id, {
    ...data,
    updaterId: userId,
    updaterName: userName,
  });
  return { success: true };
}

const dataSourceUpdateApi = {
  req: dataSourceUpdateReq,
  res: dataSourceUpdateRes,
  pathInfo: {
    path: "/data_source/update",
    method: "post",
    summary: "更新数据源配置",
  },
  adapter: bodyUserAdapter,
  service: onDataSourceUpdate,
  permission: { action: "edit" },
} satisfies API;

const dataSourceDeleteReq = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const dataSourceDeleteRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDataSourceDelete(
  params: FromSchema<typeof dataSourceDeleteReq>
) {
  await financialRepository.deleteDataSource(params.id);
  return { success: true };
}

const dataSourceDeleteApi = {
  req: dataSourceDeleteReq,
  res: dataSourceDeleteRes,
  pathInfo: {
    path: "/data_source/delete",
    method: "post",
    summary: "删除数据源配置",
  },
  adapter: bodyUserAdapter,
  service: onDataSourceDelete,
  permission: { action: "delete" },
} satisfies API;

const dataSourceSyncReq = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const dataSourceSyncRes = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    importedCount: { type: "number" },
    message: { type: "string" },
  },
  required: ["success", "importedCount", "message"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDataSourceSync(
  params: FromSchema<typeof dataSourceSyncReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";

  const ds = await financialRepository.findDataSourceById(params.id);
  if (!ds) {
    return {
      success: false,
      importedCount: 0,
      message: "未找到指定的财务数据源配置",
    };
  }

  await financialRepository.updateDataSource(params.id, {
    lastSyncTimeUtc: Date.now(),
    updaterId: userId,
    updaterName: userName,
  });

  return {
    success: true,
    importedCount: 1,
    message: `成功触发数据源 [${ds.sourceName}] 抓取并同步到收支记录`,
  };
}

const dataSourceSyncApi = {
  req: dataSourceSyncReq,
  res: dataSourceSyncRes,
  pathInfo: {
    path: "/data_source/sync",
    method: "post",
    summary: "手动立即触发数据源抓取与同步",
  },
  adapter: bodyUserAdapter,
  service: onDataSourceSync,
  permission: { action: "edit" },
} satisfies API;

const service = {
  dashboard: dashboardApi,
  incomeList: incomeListApi,
  incomeAdd: incomeAddApi,
  incomeUpdate: incomeUpdateApi,
  incomeDelete: incomeDeleteApi,
  expenseList: expenseListApi,
  expenseAdd: expenseAddApi,
  expenseUpdate: expenseUpdateApi,
  expenseDelete: expenseDeleteApi,
  dataSourceList: dataSourceListApi,
  dataSourceAdd: dataSourceAddApi,
  dataSourceUpdate: dataSourceUpdateApi,
  dataSourceDelete: dataSourceDeleteApi,
  dataSourceSync: dataSourceSyncApi,
};

export default service;
