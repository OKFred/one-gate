import * as DockerAPI from './docker';

export type ListReq = NonNullable<Parameters<typeof DockerAPI.listServicesFn>[0]>['data'];
export type ListRes = Awaited<ReturnType<typeof DockerAPI.listServicesFn>>['data']['data'];
export type InspectReq = NonNullable<Parameters<typeof DockerAPI.inspectServiceFn>[0]>['data'];
export type InspectRes = Awaited<ReturnType<typeof DockerAPI.inspectServiceFn>>['data']['data'];
export type CreateReq = NonNullable<Parameters<typeof DockerAPI.createServiceFn>[0]>['data'];
export type CreateRes = Awaited<ReturnType<typeof DockerAPI.createServiceFn>>['data']['data'];
export type UpdateReq = NonNullable<Parameters<typeof DockerAPI.updateServiceFn>[0]>['data'];
export type RemoveReq = NonNullable<Parameters<typeof DockerAPI.removeServiceFn>[0]>['data'];

/** 业务对象类型 */
export interface DockerServiceObj {
  ID: string;
  Version?: {
    Index?: number;
  };
  CreatedAt?: string;
  UpdatedAt?: string;
  Spec?: {
    Name?: string;
    Labels?: Record<string, string>;
    TaskTemplate?: {
      ContainerSpec?: {
        Image?: string;
        Env?: string[];
      };
    };
    Mode?: {
      Replicated?: {
        Replicas?: number;
      };
    };
    EndpointSpec?: {
      Ports?: Array<{
        Protocol?: 'tcp' | 'udp';
        PublishMode?: string;
        PublishedPort?: number;
        TargetPort?: number;
      }>;
    };
  };
}

export interface SwarmNodeObj {
  id: string;
  hostname: string;
  role: 'manager' | 'worker';
  status: 'ready' | 'down' | 'disconnected';
  availability: 'active' | 'drain' | 'pause';
  ip: string;
  engineVersion: string;
  nanoCpus: number;
  memoryBytes: number;
  runningTaskCount: number;
  allocatedCpus: number;
  allocatedMemory: number;
  rawJson: string;
}
