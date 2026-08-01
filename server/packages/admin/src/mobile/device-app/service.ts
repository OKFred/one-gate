import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, Context } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  IndexVO,
  MobileDeviceAppVO,
  MobileDeviceAppAddVO,
  MobileDeviceAppUpdateVO,
  MobileDeviceAppAddKeys,
  MobileDeviceAppUpdateKeys,
  MobileDeviceAppDetailKeys,
  MobileDeviceAppListKeys,
  MobileDeviceAppSortableKeys,
} from "./model";
import { mobileDeviceAppRepo } from "./repository";
import { mobileAsyncTaskRepo } from "../async-task/repository";
import { mobileAppRepo } from "../app/repository";
import mqttService from "../../mqtt/service";
import {
  GET_APPS_DETAILS_SCRIPT,
  EXECUTE_UPDATE_DOWNLOAD_SCRIPT,
} from "./scripts";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    clientId: { type: "string" },
    appId: { type: "integer" },
    installStatus: MobileDeviceAppVO["installStatus"],
    orderBy: orderByWrapper<(typeof MobileDeviceAppSortableKeys)[number][]>([
      ...MobileDeviceAppSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(MobileDeviceAppVO, [...MobileDeviceAppListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await mobileDeviceAppRepo.list({
    clientId: params.clientId,
    appId: params.appId,
    installStatus: params.installStatus,
    orderBy: params.orderBy as any,
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
  pathInfo: { path: "/list", method: "post", summary: "获取设备应用关联列表" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// Sync / Install
const taskReq = {
  type: "object",
  properties: {
    clientId: { type: "string", description: "目标设备标识" },
    appId: { type: "integer", description: "目标应用 (仅安装或更新时需要)" },
    versionId: { type: "integer", description: "目标版本 (仅安装时需要)" },
    callbackUrl: {
      type: "string",
      description:
        "移动端回调地址 (例如 http://xxxx/api/admin/mobile/device-app/callback)",
    },
  },
  required: ["clientId", "callbackUrl"],
} as const satisfies JSONSchema;

const taskRes = {
  type: "object",
  properties: {
    taskId: { type: "string" },
  },
  required: ["taskId"],
} as const satisfies JSONSchema;

async function createAndPublishTask(
  params: FromSchema<typeof taskReq>,
  userObj: UserObj,
  cat: string,
  scriptTemplate: string,
  extraVars: Record<string, string> = {}
) {
  const taskId = crypto.randomUUID();
  let finalScript = scriptTemplate;

  const vars: Record<string, string> = {
    taskId,
    callbackUrl: params.callbackUrl,
    ...extraVars,
  };

  for (const [k, v] of Object.entries(vars)) {
    finalScript = "var " + k + ' = "' + v + '";\n' + finalScript;
  }

  const now = Date.now();
  // 5 分钟超时
  const expiresAtUtc = now + 5 * 60 * 1000;

  await mobileAsyncTaskRepo.add({
    taskId,
    clientId: params.clientId,
    cat,
    script: finalScript,
    status: "PENDING",
    resultMessage: null,
    expiresAtUtc,
    remark: null,
    creatorId: userObj.id,
  });

  const topic = `autojs6/tasks/${params.clientId}`;
  await mqttService.publish.service(
    {
      topic,
      payload: JSON.stringify({
        taskId,
        cat: "autojs6",
        script: finalScript,
        timeout: 120,
        callbackUrl: params.callbackUrl,
      }),
      qos: 1,
      retain: false,
      remark: `${cat} task`,
    },
    userObj
  );

  return { taskId };
}

async function onSync(
  params: FromSchema<typeof taskReq>,
  userObj: UserObj
): Promise<FromSchema<typeof taskRes>> {
  return createAndPublishTask(params, userObj, "sync", GET_APPS_DETAILS_SCRIPT);
}

const syncApi = {
  req: taskReq,
  res: taskRes,
  pathInfo: { path: "/sync", method: "post", summary: "下发应用列表同步任务" },
  adapter: bodyUserAdapter,
  service: onSync,
  permission: { action: "sync" },
} satisfies API;

async function onInstall(
  params: FromSchema<typeof taskReq>,
  userObj: UserObj
): Promise<FromSchema<typeof taskRes>> {
  if (!params.appId) throw new BusinessError("appId is required for install");
  // FIXME: In real scenario, we should query app-version table to get apkUrl using versionId or latest.
  // Here we just use a stub or we can leave downloadUrl templated logic to caller or next iteration.
  // We'll pass a placeholder or a resolved apkUrl.

  return createAndPublishTask(
    params,
    userObj,
    "install",
    EXECUTE_UPDATE_DOWNLOAD_SCRIPT,
    {
      // Ideally this comes from querying admin_mobile_app_version by params.versionId
      downloadUrl: "https://example.com/app.apk",
    }
  );
}

const installApi = {
  req: taskReq,
  res: taskRes,
  pathInfo: { path: "/install", method: "post", summary: "下发应用安装任务" },
  adapter: bodyUserAdapter,
  service: onInstall,
  permission: { action: "install" },
} satisfies API;

// Callback webhook (no auth required ideally, or machine auth)
const callbackReq = {
  type: "object",
  properties: {
    taskId: { type: "string" },
    status: { type: "string", enum: ["SUCCESS", "FAILURE", "PROGRESS"] },
    message: { type: "string" },
    data: { type: "string" }, // JSON serialized data
  },
  required: ["taskId", "status"],
} as const satisfies JSONSchema;

async function onCallback(params: FromSchema<typeof callbackReq>) {
  const task = await mobileAsyncTaskRepo.getByTaskId(params.taskId);
  if (!task) throw new BusinessError("Task not found");
  if (task.status !== "PENDING" && params.status !== "PROGRESS") {
    return true; // Already processed
  }

  if (params.status === "PROGRESS") {
    return true; // Optionally log progress, but we skip saving to avoid DB spam
  }

  await mobileAsyncTaskRepo.updateByTaskId(params.taskId, {
    status: params.status as "SUCCESS" | "FAILURE",
    resultMessage: params.message || null,
    updaterId: 0, // System
  });

  if (params.status === "SUCCESS" && task.cat === "sync" && params.message) {
    try {
      const apps = JSON.parse(params.message);
      for (const item of apps) {
        let app = await mobileAppRepo.getByPackageName(item.packageName);
        if (!app) {
          try {
            const appId = await mobileAppRepo.add({
              packageName: item.packageName,
              name: item.name || item.packageName,
              isEnabled: true,
              description: null,
              remark: "Auto discovered",
              iconUrl: item.iconBase64 || null,
              creatorId: 0,
            });
            app = await mobileAppRepo.getById(appId);
          } catch (e) {
            app = await mobileAppRepo.getByPackageName(item.packageName);
          }
        } else if (!app.iconUrl && item.iconBase64) {
          await mobileAppRepo.update({
            id: app.id,
            iconUrl: item.iconBase64,
            updaterId: 0,
          });
          app.iconUrl = item.iconBase64;
        }

        if (app) {
          await mobileDeviceAppRepo.upsert({
            clientId: task.clientId,
            appId: app.id,
            installedVersionCode: 0, // Ideally parser gives version code
            installedVersionName: item.version,
            installStatus: "INSTALLED",
            lastSyncTimeUtc: Date.now(),
            remark: null,
            creatorId: 0,
            updaterId: 0,
          });
        }
      }
    } catch (e) {
      console.error("[Callback] Error processing sync data", e);
    }
  }

  return true;
}

const callbackApi = {
  req: callbackReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/callback",
    method: "post",
    summary: "接收移动端任务执行结果",
  },
  adapter: bodyAdapter,
  service: onCallback,
  permission: { action: "read" }, // Allow webhook? In real app this would bypass permissions or use specific token.
} satisfies API;

export default {
  list: listApi,
  sync: syncApi,
  install: installApi,
  callback: callbackApi,
};
