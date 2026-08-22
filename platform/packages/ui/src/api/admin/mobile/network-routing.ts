import { axiosPlus } from '../../config';

export type NetworkRoutingTarget = 'wifi' | 'carrier';
export type NetworkRoutingState =
  | 'DISABLED'
  | 'APPLYING'
  | 'ACTIVE'
  | 'FAILED'
  | 'ROLLBACK_FAILED'
  | 'DEGRADED';

export interface NetworkRoutingView {
  id: number;
  clientId: string;
  policyRevision: number;
  generation: number;
  lanCidrs: string[];
  lanProbeUrls: string[];
  internetProbeUrl: string;
  probeTimeoutMs: number;
  desiredTarget: NetworkRoutingTarget | null;
  actualTarget: NetworkRoutingTarget | null;
  state: NetworkRoutingState;
  lastTaskId: string | null;
  lastErrorCode: string | null;
  lastResult: Record<string, unknown> | null;
  lastVerifiedTimeUtc: number | null;
  createTimeUtc: number;
  updateTimeUtc: number | null;
}

/** 获取单台设备的网络分流配置与状态。 */
export const getNetworkRouting = (clientId: string) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/network-routing/get',
    method: 'post',
    data: { clientId },
  });

/** 保存配置并生成新的不可变策略修订。 */
export const updateNetworkRouting = (data: {
  clientId: string;
  lanCidrs: string[];
  lanProbeUrls: string[];
  internetProbeUrl: string;
  probeTimeoutMs: number;
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/network-routing/update',
    method: 'post',
    data,
  });

/** 异步切换设备 Internet 出口。 */
export const applyNetworkRouting = (data: {
  clientId: string;
  internetTarget: NetworkRoutingTarget;
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/network-routing/apply',
    method: 'post',
    data,
  });

/** 异步停用受管路由并恢复 Android 默认路由。 */
export const disableNetworkRouting = (clientId: string) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/network-routing/disable',
    method: 'post',
    data: { clientId },
  });
