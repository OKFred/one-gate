import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { Context, UserObj } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  MobileDeviceAppVO,
  MobileDeviceAppListKeys,
  MobileDeviceAppSortableKeys,
} from "./model";
import { mobileDeviceAppRepo } from "./repository";
import { mobileAppRepo } from "../app/repository";
import { mobileAppVersionRepo } from "../app-version/repository";
import {
  completeLegacyDeviceTask,
  dispatchTrustedTask,
  type DeviceTaskResultPayload,
} from "../async-task/facade.js";
import { buildTaskCallbackUrl } from "../async-task/interfaces/http/callback-url.js";
import { adaptDeviceTaskHttpError } from "../async-task/interfaces/http/error.js";
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
    orderBy: params.orderBy,
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
      description: "旧协议兼容字段；v2 不再由手机 HTTP 回调",
    },
  },
  required: ["clientId"],
} as const satisfies JSONSchema;

const taskRes = {
  type: "object",
  properties: {
    taskId: { type: "string" },
  },
  required: ["taskId"],
} as const satisfies JSONSchema;

/** 下发手机端本地应用列表采集脚本。 */
async function onSync(
  params: FromSchema<typeof taskReq>,
  userObj: UserObj,
  context: Context
): Promise<FromSchema<typeof taskRes>> {
  const task = await adaptDeviceTaskHttpError(() =>
    dispatchTrustedTask(
      {
        clientId: params.clientId,
        scriptId: "device.apps.list",
        params: {},
        timeoutMs: 120_000,
        remark: "同步设备应用列表",
        callbackUrl: buildTaskCallbackUrl(context.req.url),
      },
      userObj
    )
  );
  return { taskId: task.taskId };
}

const syncApi = {
  req: taskReq,
  res: taskRes,
  pathInfo: { path: "/sync", method: "post", summary: "下发应用列表同步任务" },
  adapter: bodyUserContextAdapter,
  service: onSync,
  permission: { action: "sync" },
} satisfies API;

/** 查询版本记录并下发手机端本地 APK 安装脚本。 */
async function onInstall(
  params: FromSchema<typeof taskReq>,
  userObj: UserObj,
  context: Context
): Promise<FromSchema<typeof taskRes>> {
  if (!params.appId) throw new BusinessError("安装任务必须提供 appId");
  if (!params.versionId) throw new BusinessError("安装任务必须提供 versionId");
  const version = await mobileAppVersionRepo.getById(params.versionId);
  if (!version || version.appId !== params.appId) {
    throw new BusinessError("应用版本不存在或与 appId 不匹配");
  }
  if (!version.isEnabled) throw new BusinessError("应用版本已停用");
  let apkUrl: URL;
  try {
    apkUrl = new URL(version.apkUrl);
  } catch {
    throw new BusinessError("应用版本的 APK 地址无效");
  }
  if (apkUrl.protocol !== "https:") {
    throw new BusinessError("应用安装仅允许 HTTPS 下载地址");
  }

  const task = await adaptDeviceTaskHttpError(() =>
    dispatchTrustedTask(
      {
        clientId: params.clientId,
        scriptId: "app.install",
        params: { downloadUrl: apkUrl.toString() },
        timeoutMs: 600_000,
        remark: `安装应用版本 ${version.versionName}`,
        callbackUrl: buildTaskCallbackUrl(context.req.url),
      },
      userObj
    )
  );
  return { taskId: task.taskId };
}

const installApi = {
  req: taskReq,
  res: taskRes,
  pathInfo: { path: "/install", method: "post", summary: "下发应用安装任务" },
  adapter: bodyUserContextAdapter,
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

interface DiscoveredApp {
  packageName: string;
  name: string;
  version: string;
  iconBase64: string | null;
}

/** 将未知设备应用列表转换为受控结构。 */
function parseDiscoveredApps(value: unknown): DiscoveredApp[] {
  if (!Array.isArray(value)) return [];
  const result: DiscoveredApp[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.packageName !== "string" || !record.packageName) continue;
    result.push({
      packageName: record.packageName,
      name: typeof record.name === "string" ? record.name : record.packageName,
      version: typeof record.version === "string" ? record.version : "",
      iconBase64:
        typeof record.iconBase64 === "string" ? record.iconBase64 : null,
    });
  }
  return result;
}

/** 将手机采集的应用列表同步到应用与设备关联表。 */
async function syncDiscoveredApps(
  clientId: string,
  value: unknown
): Promise<void> {
  for (const item of parseDiscoveredApps(value)) {
    let app = await mobileAppRepo.getByPackageName(item.packageName);
    if (!app) {
      try {
        const appId = await mobileAppRepo.add({
          packageName: item.packageName,
          name: item.name,
          isEnabled: true,
          description: null,
          remark: "Auto discovered",
          iconUrl: item.iconBase64,
          creatorId: 0,
        });
        app = await mobileAppRepo.getById(appId);
      } catch {
        app = await mobileAppRepo.getByPackageName(item.packageName);
      }
    } else if (!app.iconUrl && item.iconBase64) {
      await mobileAppRepo.update({
        id: app.id,
        iconUrl: item.iconBase64,
        updaterId: 0,
      });
      app = { ...app, iconUrl: item.iconBase64 };
    }

    if (app) {
      await mobileDeviceAppRepo.upsert({
        clientId,
        appId: app.id,
        installedVersionCode: 0,
        installedVersionName: item.version,
        installStatus: "INSTALLED",
        lastSyncTimeUtc: Date.now(),
        remark: null,
        creatorId: 0,
        updaterId: 0,
      });
    }
  }
}

/**
 * 处理任务中心发出的设备应用脚本结果。
 *
 * @param result 设备统一任务结果。
 */
export async function handleDeviceAppTaskResult(
  result: DeviceTaskResultPayload
): Promise<void> {
  if (result.status !== "SUCCESS" || result.scriptId !== "device.apps.list") {
    return;
  }
  await syncDiscoveredApps(result.deviceId, result.data);
}

/** 兼容旧手机客户端的 HTTP 回调。 */
async function onCallback(params: FromSchema<typeof callbackReq>) {
  const completion = await adaptDeviceTaskHttpError(() =>
    completeLegacyDeviceTask({
      taskId: params.taskId,
      status: params.status,
      message: params.message,
    })
  );

  if (
    completion.completed &&
    params.status === "SUCCESS" &&
    completion.task.cat === "sync" &&
    params.message
  ) {
    try {
      await syncDiscoveredApps(
        completion.task.clientId,
        JSON.parse(params.message) as unknown
      );
    } catch (error) {
      console.error("[Callback] Error processing sync data", error);
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
