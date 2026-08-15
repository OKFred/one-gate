import { axiosPlus } from '../../config';

export type ClientEnvironmentName = 'development' | 'staging' | 'production';
export type ClientDeploymentActivationMode = 'GRACEFUL' | 'FORCE';
export type ClientDeploymentPhase =
  | 'PENDING'
  | 'STAGING'
  | 'DRAINING'
  | 'PREEMPTING'
  | 'ACTIVATING'
  | 'VERIFYING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'TIMED_OUT'
  | 'CANCELLED';

export interface ClientRelease {
  id: number;
  releaseVersion: string;
  artifactKey: string;
  artifactSha256: string;
  artifactSize: number;
  manifest: Record<string, unknown>;
  status: 'PUBLISHED' | 'REVOKED';
  releaseNotes: string | null;
  createTimeUtc: number;
}

export interface ClientEnvironmentRevision {
  id: number;
  name: ClientEnvironmentName;
  isEnabled: boolean;
  revision: number;
  config: Record<string, unknown>;
  requiredSecretKeys: string[];
  createTimeUtc: number;
}

export interface ClientDeployment {
  id: number;
  deploymentId: string;
  clientId: string;
  releaseVersion: string;
  releaseDigest: string;
  environment: ClientEnvironmentName;
  environmentRevision: number;
  activationMode: ClientDeploymentActivationMode;
  drainTimeoutMs: number;
  phase: ClientDeploymentPhase;
  previousReleaseVersion: string | null;
  previousEnvironment: ClientEnvironmentName | null;
  previousEnvironmentRevision: number | null;
  resultCode: string | null;
  resultMessage: string | null;
  expiresAtUtc: number;
  createTimeUtc: number;
  updateTimeUtc: number | null;
}

/** 查询可部署客户端版本。 */
export const listClientReleases = (data = { pageNo: 1, pageSize: 100 }) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-release/list',
    method: 'post',
    data,
  });

/** 撤销版本的新部署资格，不删除已上传制品。 */
export const revokeClientRelease = (releaseVersion: string) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-release/revoke',
    method: 'post',
    data: { releaseVersion },
  });

/** 查询三个环境的当前不可变修订。 */
export const listClientEnvironments = () =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-environment/list',
    method: 'post',
    data: {},
  });

/** 新建并激活环境修订。 */
export const updateClientEnvironment = (data: {
  environment: ClientEnvironmentName;
  config: Record<string, unknown>;
  requiredSecretKeys: string[];
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-environment/update',
    method: 'post',
    data,
  });

/** 对单台设备异步应用版本与环境组合。 */
export const applyClientDeployment = (data: {
  clientId: string;
  releaseVersion: string;
  environment: ClientEnvironmentName;
  activationMode: ClientDeploymentActivationMode;
  drainTimeoutMs?: number;
  forceConfirmed?: boolean;
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-deployment/apply',
    method: 'post',
    data: { drainTimeoutMs: 15 * 60 * 1_000, forceConfirmed: false, ...data },
  });

/** 查询设备部署历史。 */
export const listClientDeployments = (data: {
  clientId: string;
  pageNo?: number;
  pageSize?: number;
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-deployment/list',
    method: 'post',
    data: { pageNo: 1, pageSize: 50, ...data },
  });

/** 创建回到指定部署之前健康组合的新部署。 */
export const rollbackClientDeployment = (data: {
  deploymentId: string;
  activationMode?: ClientDeploymentActivationMode;
  forceConfirmed?: boolean;
}) =>
  axiosPlus({
    url: '/api/v1/admin/mobile/client-deployment/rollback',
    method: 'post',
    data: { activationMode: 'GRACEFUL', forceConfirmed: false, ...data },
  });
