import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  MobileAsyncTaskVO,
  MobileAsyncTaskListKeys,
  MobileAsyncTaskSortableKeys,
} from "./model";
import { mobileAsyncTaskRepo } from "./repository";

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    clientId: MobileAsyncTaskVO["clientId"],
    status: MobileAsyncTaskVO["status"],
    orderBy: orderByWrapper<(typeof MobileAsyncTaskSortableKeys)[number][]>([
      ...MobileAsyncTaskSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(MobileAsyncTaskVO, [...MobileAsyncTaskListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await mobileAsyncTaskRepo.list({
    keyword: (params as { keyword?: string }).keyword,
    clientId: params.clientId as string | undefined,
    status: params.status as
      | "PENDING"
      | "SUCCESS"
      | "FAILURE"
      | "TIMEOUT"
      | undefined,
    orderBy: params.orderBy as
      | (typeof MobileAsyncTaskSortableKeys)[number]
      | undefined,
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list as unknown as FromSchema<typeof listRes>["list"],
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取异步任务" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

export default {
  list: listApi,
};
