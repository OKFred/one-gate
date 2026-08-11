import * as DeviceAPI from './device';
import * as AppAPI from './app';
import * as AppVersionAPI from './app-version';
import * as DeviceAppAPI from './device-app';
import * as AsyncTaskAPI from './async-task';

// --- Device ---
export type ListDeviceReq = NonNullable<Parameters<typeof DeviceAPI.listFn>[0]['data']>;
export type ListDeviceRes = Awaited<ReturnType<typeof DeviceAPI.listFn>>['data']['data'];

export type AddDeviceReq = NonNullable<Parameters<typeof DeviceAPI.addFn>[0]['data']>;
export type AddDeviceRes = Awaited<ReturnType<typeof DeviceAPI.addFn>>['data']['data'];

export type UpdateDeviceReq = NonNullable<Parameters<typeof DeviceAPI.updateFn>[0]['data']>;
export type UpdateDeviceRes = Awaited<ReturnType<typeof DeviceAPI.updateFn>>['data']['data'];

export type DeleteDeviceReq = NonNullable<Parameters<typeof DeviceAPI.deleteFn>[0]['data']>;
export type DeleteDeviceRes = Awaited<ReturnType<typeof DeviceAPI.deleteFn>>['data']['data'];

export type GetDeviceReq = NonNullable<Parameters<typeof DeviceAPI.getFn>[0]['data']>;
export type GetDeviceRes = Awaited<ReturnType<typeof DeviceAPI.getFn>>['data']['data'];

export type UpdateDeviceMetadataReq = NonNullable<
  Parameters<typeof DeviceAPI.updateMetadataFn>[0]['data']
>;

export type ListDeviceEventReq = NonNullable<Parameters<typeof DeviceAPI.listEventsFn>[0]['data']>;
export type ListDeviceEventRes = Awaited<ReturnType<typeof DeviceAPI.listEventsFn>>['data']['data'];

export type RevealDeviceSensitiveReq = NonNullable<
  Parameters<typeof DeviceAPI.revealSensitiveFn>[0]['data']
>;

// --- App ---
export type ListAppReq = NonNullable<Parameters<typeof AppAPI.listFn>[0]['data']>;
export type ListAppRes = Awaited<ReturnType<typeof AppAPI.listFn>>['data']['data'];

export type AddAppReq = NonNullable<Parameters<typeof AppAPI.addFn>[0]['data']>;
export type AddAppRes = Awaited<ReturnType<typeof AppAPI.addFn>>['data']['data'];

export type UpdateAppReq = NonNullable<Parameters<typeof AppAPI.updateFn>[0]['data']>;
export type UpdateAppRes = Awaited<ReturnType<typeof AppAPI.updateFn>>['data']['data'];

export type DeleteAppReq = NonNullable<Parameters<typeof AppAPI.deleteFn>[0]['data']>;
export type DeleteAppRes = Awaited<ReturnType<typeof AppAPI.deleteFn>>['data']['data'];

// --- App Version ---
export type ListAppVersionReq = NonNullable<Parameters<typeof AppVersionAPI.listFn>[0]['data']>;
export type ListAppVersionRes = Awaited<ReturnType<typeof AppVersionAPI.listFn>>['data']['data'];

export type AddAppVersionReq = NonNullable<Parameters<typeof AppVersionAPI.addFn>[0]['data']>;
export type AddAppVersionRes = Awaited<ReturnType<typeof AppVersionAPI.addFn>>['data']['data'];

export type UpdateAppVersionReq = NonNullable<Parameters<typeof AppVersionAPI.updateFn>[0]['data']>;
export type UpdateAppVersionRes = Awaited<
  ReturnType<typeof AppVersionAPI.updateFn>
>['data']['data'];

export type DeleteAppVersionReq = NonNullable<Parameters<typeof AppVersionAPI.deleteFn>[0]['data']>;
export type DeleteAppVersionRes = Awaited<
  ReturnType<typeof AppVersionAPI.deleteFn>
>['data']['data'];

// --- Device App ---
export type ListDeviceAppReq = NonNullable<Parameters<typeof DeviceAppAPI.listFn>[0]['data']>;
export type ListDeviceAppRes = Awaited<ReturnType<typeof DeviceAppAPI.listFn>>['data']['data'];

export type SyncDeviceAppReq = NonNullable<Parameters<typeof DeviceAppAPI.syncFn>[0]['data']>;
export type SyncDeviceAppRes = Awaited<ReturnType<typeof DeviceAppAPI.syncFn>>['data']['data'];

export type InstallDeviceAppReq = NonNullable<Parameters<typeof DeviceAppAPI.installFn>[0]['data']>;
export type InstallDeviceAppRes = Awaited<
  ReturnType<typeof DeviceAppAPI.installFn>
>['data']['data'];

// --- Async Task ---
export type ListAsyncTaskReq = NonNullable<Parameters<typeof AsyncTaskAPI.listFn>[0]['data']>;
export type ListAsyncTaskRes = Awaited<ReturnType<typeof AsyncTaskAPI.listFn>>['data']['data'];
