import { axiosPlus } from '../config';
import type { SwarmNodeObj } from './type';

interface ListNodesConfig {
  data?: {
    filters?: Record<string, string[]>;
  };
}

interface ListNodesResponse {
  data: {
    ok: boolean;
    data: SwarmNodeObj[];
    message: string;
  };
}

export const listNodesFn = (axiosConfig?: ListNodesConfig): Promise<ListNodesResponse> => {
  const caller = axiosPlus as unknown as (config: unknown) => Promise<ListNodesResponse>;
  return caller({
    url: '/api/v1/swarm/nodes/list',
    method: 'post',
    ...axiosConfig,
  });
};
