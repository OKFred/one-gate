import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { adminMobileDeviceBackendSchemas } from "@hodor/contracts/resources";
import { createCrudApis } from "@hodor/core/middleware/encapsulation/crud";
import {
  bodyAdapter,
  bodyUserContextAdapter,
  bodyUserAdapter,
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import {
  listReqBase,
  listResponseWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { Context, UserObj } from "@hodor/core/types/app";

import {
  addDevice,
  deleteDevice,
  getDevice,
  listDeviceEvents,
  listDevices,
  processDeviceEvent,
  processDeviceInfo,
  processDevicePresence,
  resetDeviceReportToken,
  revealDeviceSensitive,
  updateDevice,
  updateDeviceMetadata,
  verifyDeviceReportToken,
  type DeviceEventInput,
  type DeviceInfoInput,
  type DevicePresenceInput,
} from "./facade.js";
import {
  parseDeviceDeploymentEvent,
  type DeviceDeploymentEvent,
} from "../client-deployment/domain/deployment.js";
import { processIncomingDeploymentEvent } from "../client-deployment/facade.js";
import { ClientDeploymentReportVO } from "../client-deployment/model.js";
import { parseNetworkRoutingStatusEvent } from "../network-routing/domain.js";
import { processNetworkRoutingStatus } from "../network-routing/facade.js";
import { NetworkRoutingStatusReportVO } from "../network-routing/model.js";
import type { DeviceReportedStatus } from "./domain/device.js";
import type { DeviceSortKey } from "./application/ports.js";
import { DeviceApplicationError } from "./application/error.js";
import { adaptDeviceHttpError } from "./interfaces/http/error.js";
import { reportTokenFromContext } from "./interfaces/http/report-token.js";
import { scheduleDeviceDetailAuthorizationShadow } from "./interfaces/http/authorization-shadow.js";
import { taskRuntimeCenter } from "../async-task/runtime/index.js";
import { MobileTaskRuntimeReportSchema } from "../async-task/runtime/model.js";
import { adaptDeviceTaskHttpError } from "../async-task/interfaces/http/error.js";
import { hashDeviceToken } from "./infrastructure/crypto.js";
import {
  CustomMetadataValueVO,
  DEVICE_EVENT_TYPES,
  DeviceEventReportVO,
  DeviceEventVO,
  DeviceInfoReportVO,
  DevicePresenceReportVO,
  IndexVO,
  MobileDeviceSortableKeys,
} from "./model.js";

const S = adminMobileDeviceBackendSchemas;

function toDeviceSortKey(val?: string): DeviceSortKey | undefined {
  return MobileDeviceSortableKeys.find((k) => k === val);
}

function toOnlineStatus(val?: string | null): DeviceReportedStatus | undefined {
  if (val === "ONLINE" || val === "OFFLINE") return val;
  return undefined;
}

const crudApis = createCrudApis(S, {
  list: {
    summary: "分页获取移动设备",
    handler: (params: FromSchema<typeof S.listReq>) =>
      adaptDeviceHttpError(() =>
        listDevices({
          pageNo: params.pageNo ?? 1,
          pageSize: params.pageSize ?? 10,
          keyword: params.keyword,
          isEnabled: params.isEnabled,
          onlineStatus: toOnlineStatus(params.onlineStatus),
          orderBy: toDeviceSortKey(params.orderBy),
          descend: params.descend,
        })
      ),
  },
  add: {
    summary: "添加移动设备",
    handler: (params: FromSchema<typeof S.addReq>, userObj: UserObj) =>
      adaptDeviceHttpError(() => addDevice(params, { id: userObj.id })),
  },
  update: {
    summary: "更新移动设备",
    resSchema: { type: "boolean" } as const,
    handler: (params: FromSchema<typeof S.updateReq>, userObj: UserObj) =>
      adaptDeviceHttpError(() => updateDevice(params, { id: userObj.id })),
  },
  get: {
    adapter: bodyUserContextAdapter,
    summary: "获取设备详情",
    handler: (
      params: FromSchema<typeof S.getReq>,
      userObj: UserObj,
      context: Context
    ) =>
      adaptDeviceHttpError(async () => {
        const device = await getDevice(params.id);
        void scheduleDeviceDetailAuthorizationShadow(
          {
            deviceId: params.id,
            isEnabled: device.isEnabled,
            requestId: context.get("requestId"),
            actor: {
              userId: userObj.userId,
              roleIds: userObj.roleIds,
              isSuperAdmin: userObj.isSuperAdmin,
            },
          },
          {
            waitUntil: (promise) => context.executionCtx.waitUntil(promise),
          }
        );
        return device;
      }),
  },
  delete: {
    summary: "删除移动设备",
    resSchema: { type: "boolean" } as const,
    handler: (params: FromSchema<typeof S.deleteReq>) =>
      adaptDeviceHttpError(() => deleteDevice(params.id)),
  },
});

const updateMetadataReq = {
  type: "object",
  properties: {
    id: IndexVO.id,
    customMetadata: {
      type: "object",
      additionalProperties: CustomMetadataValueVO,
    },
  },
  required: ["id", "customMetadata"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateMetadataApi = {
  req: updateMetadataReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/metadata/update",
    method: "post",
    summary: "更新设备自定义元数据",
  },
  adapter: bodyUserAdapter,
  service: (params: FromSchema<typeof updateMetadataReq>, userObj: UserObj) =>
    adaptDeviceHttpError(() =>
      updateDeviceMetadata(params, { id: userObj.id })
    ),
  permission: { action: "edit" },
} satisfies API;

const eventListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    deviceId: IndexVO.id,
    eventType: {
      type: ["string", "null"],
      enum: [...DEVICE_EVENT_TYPES, null],
      nullable: true,
    },
    startTimeUtc: { type: ["number", "null"], nullable: true },
    endTimeUtc: { type: ["number", "null"], nullable: true },
  },
  required: ["deviceId", "pageNo", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const eventListRes = listResponseWrapper(DeviceEventVO, [
  "id",
  "eventId",
  "clientId",
  "eventType",
  "eventTimeUtc",
  "summary",
  "hasSensitivePayload",
  "createTimeUtc",
]);
const eventListApi = {
  req: eventListReq,
  res: eventListRes,
  pathInfo: { path: "/event/list", method: "post", summary: "查询设备事件" },
  adapter: bodyAdapter,
  service: (params: FromSchema<typeof eventListReq>) =>
    adaptDeviceHttpError(() =>
      listDeviceEvents({
        deviceId: params.deviceId,
        pageNo: params.pageNo,
        pageSize: params.pageSize,
        eventType: params.eventType ?? undefined,
        startTimeUtc: params.startTimeUtc ?? undefined,
        endTimeUtc: params.endTimeUtc ?? undefined,
      })
    ),
  permission: { action: "read" },
} satisfies API;

const revealReq = {
  type: "object",
  properties: {
    id: IndexVO.id,
    target: {
      type: "string",
      enum: ["identifiers", "customMetadata", "event"],
    },
  },
  required: ["id", "target"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const revealApi = {
  req: revealReq,
  res: {
    type: "object",
    additionalProperties: true,
  } as const satisfies JSONSchema,
  pathInfo: {
    path: "/sensitive/reveal",
    method: "post",
    summary: "查看设备敏感信息",
  },
  adapter: bodyAdapter,
  service: (params: FromSchema<typeof revealReq>) =>
    adaptDeviceHttpError(() => revealDeviceSensitive(params.id, params.target)),
  permission: { action: "view" },
} satisfies API;

const resetTokenApi = {
  req: S.getReq,
  res: {
    type: "object",
    properties: { token: { type: "string" } },
    required: ["token"],
    additionalProperties: false,
  } as const,
  pathInfo: {
    path: "/report-token/reset",
    method: "post",
    summary: "生成或重置设备上报令牌",
  },
  adapter: bodyAdapter,
  service: (params: FromSchema<typeof S.getReq>) =>
    adaptDeviceHttpError(() => resetDeviceReportToken(params.id)),
  permission: { action: "edit" },
} satisfies API;

const presenceReportReq = {
  type: "object",
  properties: DevicePresenceReportVO,
  required: ["protocolVersion", "deviceId", "status", "timestamp"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const infoReportReq = {
  type: "object",
  properties: DeviceInfoReportVO,
  required: Object.keys(DeviceInfoReportVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const eventReportReq = {
  type: "object",
  properties: DeviceEventReportVO,
  required: Object.keys(DeviceEventReportVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const deploymentReportReq = {
  type: "object",
  properties: ClientDeploymentReportVO,
  required: Object.keys(ClientDeploymentReportVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const networkRoutingStatusReportReq = {
  type: "object",
  properties: NetworkRoutingStatusReportVO,
  required: Object.keys(NetworkRoutingStatusReportVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const acceptedRes = {
  type: "object",
  properties: {
    accepted: { type: "boolean" },
    duplicate: { type: "boolean" },
  },
  required: ["accepted", "duplicate"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const reportPresenceApi = {
  req: presenceReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/presence",
    method: "post",
    summary: "设备 Presence 上报",
  },
  adapter: rawAdapter,
  service: (context: Context) =>
    adaptDeviceHttpError(async () => {
      const input = context.get("bodyObj") as DevicePresenceInput;
      await processDevicePresence(input, reportTokenFromContext(context));
      return { accepted: true, duplicate: false };
    }),
  permission: false,
} satisfies API;
const reportInfoApi = {
  req: infoReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/info",
    method: "post",
    summary: "设备静态信息上报",
  },
  adapter: rawAdapter,
  service: (context: Context) =>
    adaptDeviceHttpError(async () => {
      const input = context.get("bodyObj") as DeviceInfoInput;
      await processDeviceInfo(input, reportTokenFromContext(context));
      return { accepted: true, duplicate: false };
    }),
  permission: false,
} satisfies API;
const reportEventApi = {
  req: eventReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/event",
    method: "post",
    summary: "设备事件上报",
  },
  adapter: rawAdapter,
  service: (context: Context) =>
    adaptDeviceHttpError(async () => {
      const input = context.get("bodyObj") as DeviceEventInput;
      const result = await processDeviceEvent(
        input,
        reportTokenFromContext(context)
      );
      return { accepted: true, duplicate: result.duplicate };
    }),
  permission: false,
} satisfies API;
const reportDeploymentApi = {
  req: deploymentReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/deployment",
    method: "post",
    summary: "设备客户端部署阶段上报",
  },
  adapter: rawAdapter,
  service: (context: Context) =>
    adaptDeviceHttpError(async () => {
      const parsed = parseDeviceDeploymentEvent(context.get("bodyObj"));
      if (!parsed) throw new DeviceApplicationError("Invalid deployment event");
      const event: DeviceDeploymentEvent = parsed;
      await verifyDeviceReportToken(
        event.deviceId,
        reportTokenFromContext(context)
      );
      const result = await processIncomingDeploymentEvent(event);
      if (result === "REJECTED") {
        throw new DeviceApplicationError("Deployment event was rejected");
      }
      return { accepted: true, duplicate: result === "DUPLICATE" };
    }),
  permission: false,
} satisfies API;
const reportNetworkRoutingApi = {
  req: networkRoutingStatusReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/network-routing",
    method: "post",
    summary: "设备网络分流运行状态上报",
  },
  adapter: rawAdapter,
  service: (context: Context) =>
    adaptDeviceHttpError(async () => {
      const event = parseNetworkRoutingStatusEvent(context.get("bodyObj"));
      if (!event)
        throw new DeviceApplicationError("Invalid network routing status");
      await verifyDeviceReportToken(
        event.deviceId,
        reportTokenFromContext(context)
      );
      const updated = await processNetworkRoutingStatus(event);
      return { accepted: true, duplicate: !updated };
    }),
  permission: false,
} satisfies API;

const reportTaskStateApi = {
  req: MobileTaskRuntimeReportSchema,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/report/task-state",
    method: "post",
    summary: "设备真实任务队列上报",
  },
  adapter: rawAdapter,
  service: (context: Context) =>
    adaptDeviceTaskHttpError(() =>
      adaptDeviceHttpError(async () => {
        const input = context.get("bodyObj") as FromSchema<
          typeof MobileTaskRuntimeReportSchema
        >;
        const token = reportTokenFromContext(context);
        await verifyDeviceReportToken(input.deviceId, token);
        return taskRuntimeCenter.report(input, await hashDeviceToken(token));
      })
    ),
  permission: false,
} satisfies API;

// Keep key order aligned with service.spec.ts (get before delete)
export default {
  list: crudApis.list,
  add: crudApis.add,
  update: crudApis.update,
  get: crudApis.get,
  delete: crudApis.delete,
  updateMetadata: updateMetadataApi,
  eventList: eventListApi,
  reveal: revealApi,
  resetToken: resetTokenApi,
  reportPresence: reportPresenceApi,
  reportInfo: reportInfoApi,
  reportEvent: reportEventApi,
  reportDeployment: reportDeploymentApi,
  reportNetworkRouting: reportNetworkRoutingApi,
  reportTaskState: reportTaskStateApi,
};
