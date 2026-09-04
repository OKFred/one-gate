import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import {
  bodyAdapter,
  bodyUserContextAdapter,
  bodyUserAdapter,
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
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
import { DeviceApplicationError } from "./application/error.js";
import { adaptDeviceHttpError } from "./interfaces/http/error.js";
import { reportTokenFromContext } from "./interfaces/http/report-token.js";
import { scheduleDeviceDetailAuthorizationShadow } from "./interfaces/http/authorization-shadow.js";
import {
  CustomMetadataValueVO,
  DEVICE_EVENT_TYPES,
  DeviceEventReportVO,
  DeviceEventVO,
  DeviceInfoReportVO,
  DevicePresenceReportVO,
  IndexVO,
  MobileDeviceAddKeys,
  MobileDeviceAddVO,
  MobileDeviceDetailKeys,
  MobileDeviceListKeys,
  MobileDeviceSortableKeys,
  MobileDeviceUpdateKeys,
  MobileDeviceUpdateVO,
  MobileDeviceVO,
} from "./model.js";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MobileDeviceVO.isEnabled,
    onlineStatus: {
      type: ["string", "null"],
      enum: ["ONLINE", "OFFLINE", null],
      nullable: true,
    },
    orderBy: orderByWrapper<(typeof MobileDeviceSortableKeys)[number][]>([
      ...MobileDeviceSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper(MobileDeviceVO, [...MobileDeviceListKeys]),
} as const satisfies JSONSchema;
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取移动设备" },
  adapter: bodyAdapter,
  service: (params: FromSchema<typeof listReq>) =>
    adaptDeviceHttpError(() =>
      listDevices({
        pageNo: params.pageNo,
        pageSize: params.pageSize,
        keyword: params.keyword,
        isEnabled: params.isEnabled,
        onlineStatus: params.onlineStatus ?? undefined,
        orderBy: params.orderBy,
        descend: params.descend,
      })
    ),
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: { ...MobileDeviceAddVO },
  required: [...MobileDeviceAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;
const idRes = { ...IndexVO.id } as const satisfies JSONSchema;
const addApi = {
  req: addReq,
  res: idRes,
  pathInfo: { path: "/add", method: "post", summary: "添加移动设备" },
  adapter: bodyUserAdapter,
  service: (params: FromSchema<typeof addReq>, userObj: UserObj) =>
    adaptDeviceHttpError(() => addDevice(params, { id: userObj.id })),
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: { ...MobileDeviceUpdateVO },
  required: [...MobileDeviceUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateApi = {
  req: updateReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/update", method: "post", summary: "更新移动设备" },
  adapter: bodyUserAdapter,
  service: (params: FromSchema<typeof updateReq>, userObj: UserObj) =>
    adaptDeviceHttpError(() => updateDevice(params, { id: userObj.id })),
  permission: { action: "edit" },
} satisfies API;

const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...MobileDeviceVO },
    required: [...MobileDeviceDetailKeys],
    additionalProperties: false,
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取设备详情" },
  adapter: bodyUserContextAdapter,
  service: (
    params: FromSchema<typeof getReq>,
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
  permission: { action: "read" },
} satisfies API;
const deleteApi = {
  req: getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/delete", method: "post", summary: "删除移动设备" },
  adapter: bodyAdapter,
  service: (params: FromSchema<typeof getReq>) =>
    adaptDeviceHttpError(() => deleteDevice(params.id)),
  permission: { action: "delete" },
} satisfies API;

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
  req: getReq,
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
  service: (params: FromSchema<typeof getReq>) =>
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

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  get: getApi,
  delete: deleteApi,
  updateMetadata: updateMetadataApi,
  eventList: eventListApi,
  reveal: revealApi,
  resetToken: resetTokenApi,
  reportPresence: reportPresenceApi,
  reportInfo: reportInfoApi,
  reportEvent: reportEventApi,
  reportDeployment: reportDeploymentApi,
  reportNetworkRouting: reportNetworkRoutingApi,
};
