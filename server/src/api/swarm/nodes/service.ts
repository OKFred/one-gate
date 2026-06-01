import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { API } from "@/middleware/encapsulation";
import { bodyAdapter } from "@/middleware/encapsulation/adapter";
import { dockerClient } from "../docker/client";
import { listReq, listRes } from "./model";

/**
 * 1. 列出所有节点及其资源分配负载情况
 */
async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  // 1. 获取所有 Swarm 节点
  const nodes = await dockerClient.listNodes();

  // 2. 获取集群所有正在运行中的任务副本
  let tasks: any[] = [];
  try {
    tasks = await dockerClient.listTasks({
      "desired-state": ["running"],
    });
  } catch (error) {
    console.error("Failed to list Swarm tasks for load metrics:", error);
  }

  // 3. 按节点 ID 汇总任务数及分配资源
  // CPU 以核为单位 (nanoCPUs / 1,000,000,000)
  // Memory 以字节为单位
  const nodeMetricsMap = new Map<
    string,
    { count: number; cpus: number; memory: number }
  >();

  for (const task of tasks) {
    const nodeId = task.NodeID;
    if (!nodeId) continue;

    const resources = task.Spec?.Resources;
    const reservedCpus =
      resources?.Reservations?.NanoCPUs || resources?.Limits?.NanoCPUs || 0;
    const reservedMemory =
      resources?.Reservations?.MemoryBytes ||
      resources?.Limits?.MemoryBytes ||
      0;

    const current = nodeMetricsMap.get(nodeId) || {
      count: 0,
      cpus: 0,
      memory: 0,
    };
    nodeMetricsMap.set(nodeId, {
      count: current.count + 1,
      cpus: current.cpus + reservedCpus,
      memory: current.memory + reservedMemory,
    });
  }

  // 4. 组装节点展示模型
  const resultList = nodes.map((node: any) => {
    const nodeId = node.ID || "";
    const metrics = nodeMetricsMap.get(nodeId) || {
      count: 0,
      cpus: 0,
      memory: 0,
    };

    // 获取可用性、状态、引擎版本、物理硬件规格等
    const spec = node.Spec || {};
    const desc = node.Description || {};
    const status = node.Status || {};

    const nanoCpus = desc.Resources?.NanoCPUs || 0;
    const memoryBytes = desc.Resources?.MemoryBytes || 0;

    // 将分配的 nanoCPUs 转换成核数
    const allocatedCpus =
      Math.round((metrics.cpus / 1_000_000_000) * 100) / 100;
    const allocatedMemory = metrics.memory;

    return {
      id: nodeId,
      hostname: desc.Hostname || spec.Name || nodeId,
      role: (spec.Role || "worker").toLowerCase() as "manager" | "worker",
      status: (status.State || "down").toLowerCase() as
        | "ready"
        | "down"
        | "disconnected",
      availability: (spec.Availability || "active").toLowerCase() as
        | "active"
        | "drain"
        | "pause",
      ip: status.Addr || "",
      engineVersion: desc.Engine?.EngineVersion || "",
      nanoCpus: nanoCpus / 1_000_000_000, // 转换成核心数展示
      memoryBytes: memoryBytes,
      runningTaskCount: metrics.count,
      allocatedCpus: allocatedCpus,
      allocatedMemory: allocatedMemory,
      rawJson: JSON.stringify(node, null, 2),
    };
  });

  return resultList;
}

const listNodes = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "列出 Docker Swarm 集群节点及其实时分配负载情况",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

export default {
  listNodes,
};
